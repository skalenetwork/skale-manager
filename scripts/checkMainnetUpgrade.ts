import chalk from "chalk";
import {contracts} from "../migrations/deploy";
import {ethers} from "hardhat";
import {Upgrader, Submitter} from "@skalenetwork/upgrade-tools";
import {skaleContracts, Instance} from "@skalenetwork/skale-contracts-ethers-v6";
import {SkaleManager} from "../typechain-types";
import {Manifest, getImplementationAddress} from "@openzeppelin/upgrades-core";
import {Transaction} from "ethers";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";

async function getSkaleManagerInstance() {
    if (process.env.ABI) {
        console.log("This version of the upgrade script ignores manually provided ABI");
        console.log("Do not set ABI environment variable");
    }
    if (!process.env.TARGET) {
        console.log(chalk.red("Specify desired skale-manager instance"));
        console.log(chalk.red("Set instance alias or SkaleManager address to TARGET environment variable"));
        process.exit(1);
    }
    const network = await skaleContracts.getNetworkByProvider(ethers.provider);
    const project = network.getProject("skale-manager");
    return await project.getInstance(process.env.TARGET);
}

class SkaleManagerUpgrader extends Upgrader {
    constructor(
        targetVersion: string,
        instance: Instance,
        contractNamesToUpgrade: string[],
        submitter?: Submitter) {
            super(
                {
                    contractNamesToUpgrade,
                    instance,
                    name: "skale-manager",
                    version: targetVersion
                },
                submitter
            );
        }

    async getSkaleManager() {
        return await this.instance.getContract("SkaleManager") as SkaleManager;
    }

    getDeployedVersion = async () => {
        const skaleManager = await this.getSkaleManager();
        try {
            return await skaleManager.version();
        } catch {
            console.log(chalk.red("Can't read deployed version"));
        }
    }

    setVersion = async (newVersion: string) => {
        const skaleManager = await this.getSkaleManager();
        this.transactions.push(Transaction.from({
            to: await skaleManager.getAddress(),
            data: skaleManager.interface.encodeFunctionData("setVersion", [newVersion])
        }));
    }
}

async function timeHelpersWithDebugIsUsed(timeHelpersAddress: string) {
    const implementationAddress = await getImplementationAddress(ethers.provider, timeHelpersAddress)
    const manifest = await Manifest.forNetwork(ethers.provider);
    const deployment = await manifest.getDeploymentFromAddress(implementationAddress);
    const storageLayout = deployment.layout.storage;
    return storageLayout.find(storageItem => storageItem.label === "_timeShift") !== undefined;
}

async function prepareContractsList(instance: Instance) {
    // If skale-manager is deployed not in production mode
    // the smart contract TimeHelpers is replaced
    // with the TimeHelpersWithDebug.
    // TimeHelpersWithDebug is registered as TimeHelpers
    // in the ContractManager.
    // It causes an error in upgrade-tools v3 and higher
    // because it uses a factory from TimeHelpers
    // and address of TimeHelpersWithDebug

    // This function determines if TimeHelpersWithDebug is used
    // and replaces TimeHelpers with TimeHelpersWithDebug
    // in a list of smart contracts to upgrade if needed

    if (await timeHelpersWithDebugIsUsed(await instance.getContractAddress("TimeHelpers"))) {
        const contractsWithDebug = contracts.
            filter((contract) => contract !== "TimeHelpers");
        contractsWithDebug.push("TimeHelpersWithDebug");
        return contractsWithDebug;
    }
    return contracts;
}

class MockSubmitter extends Submitter {
    private signer: HardhatEthersSigner;
    name = "Mock Submitter";
    constructor(signer: HardhatEthersSigner) {
        super();
        this.atomicSubmitter = true; // Lets pretend it is atomic - testing only
        this.signer = signer;
    }

    async submit(
        transactions: Transaction[]
    ): Promise<void> {
        console.log(chalk.yellow(`MockSubmitter: Submitting transactions mocking ${await this.signer.getAddress()}`));
        for (const tx of transactions) {
            const sentTx = await this.signer.sendTransaction(tx);
            await sentTx.wait();
            console.log(chalk.white(`MockSubmitter: Transaction with hash ${sentTx.hash} confirmed.`));
        }
        console.log(chalk.green("MockSubmitter: All transactions submitted."))
    }
}

async function createMockSubmitter(contractManagerAddress: string): Promise<Submitter> {
    const contractManager = await ethers.getContractAt("ContractManager", contractManagerAddress);
    const owner = await contractManager.owner();
    const signer = await ethers.getImpersonatedSigner(owner);
    return new MockSubmitter(signer);
}

async function main() {
    const skaleManager = await getSkaleManagerInstance();
    const contractsToUpgrade = await prepareContractsList(skaleManager);
    if ((await ethers.provider.getNetwork()).chainId !== 31337n) {
        throw new Error("This script is intended to be run on mainnet fork only.");
    }
    const upgrader = new SkaleManagerUpgrader(
        "1.12.0",
        skaleManager,
        contractsToUpgrade,
        await createMockSubmitter(await skaleManager.getContractAddress("ContractManager"))
    );
    await upgrader.upgrade();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
