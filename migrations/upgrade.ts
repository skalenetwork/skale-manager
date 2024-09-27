import chalk from "chalk";
import {contracts} from "./deploy";
import {ethers, upgrades} from "hardhat";
import {Upgrader, Submitter} from "@skalenetwork/upgrade-tools";
import {skaleContracts, Instance} from "@skalenetwork/skale-contracts-ethers-v6";
import {ContractManager, PaymasterController, SkaleManager} from "../typechain-types";
import {Manifest, getImplementationAddress} from "@openzeppelin/upgrades-core";
import {Transaction} from "ethers";

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

    deployNewContracts = async () => {
        const [deployer] = await ethers.getSigners();

        const contractManager = await this.instance.getContract("ContractManager") as ContractManager;

        const paymasterControllerFactory = await ethers.getContractFactory("PaymasterController");
        console.log("Deploy PaymasterController");
        const paymasterController = await upgrades.deployProxy(
            paymasterControllerFactory,
            [await ethers.resolveAddress(contractManager)],
            {
                initialOwner: await this.getOwner()
            }
        ) as unknown as PaymasterController;
        await paymasterController.deploymentTransaction()?.wait();

        // Register in the ContractManager
        this.transactions.push(Transaction.from({
            to: await contractManager.getAddress(),
            data: contractManager.interface.encodeFunctionData(
                "setContractsAddress",
                ["PaymasterController", await paymasterController.getAddress()]
            )
        }));

        const ima = process.env.IMA ?? "0x8629703a9903515818C2FeB45a6f6fA5df8Da404";
        const marionette = process.env.MARIONETTE ?? "0xef777804e94eac176bbdbb3b3c9da06de87227ba";
        const paymaster = process.env.PAYMASTER ?? "0x0d66cA00CbAD4219734D7FDF921dD7Caadc1F78D";
        const paymasterChainHash = process.env.PAYMASTER_CHAIN_HASH ?? ethers.solidityPackedKeccak256(["string"], ["elated-tan-skat"]); // Europa

        console.log(`Set IMA address to ${ima}`);
        await (await paymasterController.setImaAddress(ima)).wait();

        console.log(`Set Marionette address to ${marionette}`);
        await (await paymasterController.setMarionetteAddress(marionette)).wait();

        console.log(`Set Paymaster address to ${paymaster}`);
        await (await paymasterController.setPaymasterAddress(paymaster)).wait();

        console.log(`Set Paymaster schain hash to ${paymasterChainHash}`);
        await (await paymasterController.setPaymasterChainHash(paymasterChainHash)).wait();

        console.log("Revoke PAYMASTER_SETTER_ROLE");
        await (await paymasterController.revokeRole(
            await paymasterController.PAYMASTER_SETTER_ROLE(),
            deployer
        )).wait();

        const owner = await contractManager.owner();
        if (!await paymasterController.hasRole(await paymasterController.DEFAULT_ADMIN_ROLE(), owner)) {
            console.log(`Grant ownership to ${owner}`);
            await (await paymasterController.grantRole(
                await paymasterController.DEFAULT_ADMIN_ROLE(),
                owner
            )).wait();

            console.log(`Revoke ownership from ${ethers.resolveAddress(deployer)}`);
            await (await paymasterController.revokeRole(
                await paymasterController.DEFAULT_ADMIN_ROLE(),
                deployer
            )).wait();
        }
    };
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

async function main() {
    const skaleManager = await getSkaleManagerInstance();
    let contractsToUpgrade = [
        "Distributor",
        "Nodes",
        "Schains",
        "ValidatorService"
    ];
    if (process.env.UPGRADE_ALL) {
        contractsToUpgrade = await prepareContractsList(skaleManager);
    }
    // TODO: remove after 1.12.0 release
    contractsToUpgrade = contractsToUpgrade.filter((contract) => contract !== "PaymasterController")
    // End of TODO
    const upgrader = new SkaleManagerUpgrader(
        "1.11.0",
        skaleManager,
        contractsToUpgrade
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
