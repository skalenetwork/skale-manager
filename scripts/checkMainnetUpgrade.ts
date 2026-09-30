import chalk from "chalk";
import {ethers} from "hardhat";
import {Submitter} from "@skalenetwork/upgrade-tools";
import {Transaction} from "ethers";
import {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/signers";
import { getSkaleManagerInstance, prepareContractsList, SkaleManagerUpgrader } from "../migrations/upgrade";

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
            // Required hack for hardhat network
            const txRequest = {
                to: tx.to,
                data: tx.data,
            };
            // End of hack
            const sentTx = await this.signer.sendTransaction(txRequest);
            await sentTx.wait();
            console.log(chalk.white(`MockSubmitter: Transaction with hash ${sentTx.hash} confirmed.`));
        }
        console.log(chalk.green("MockSubmitter: All transactions submitted."))
    }
}

async function createMockSubmitter(contractManagerAddress: string): Promise<Submitter> {
    const contractManager = await ethers.getContractAt("ContractManager", contractManagerAddress);
    const owner = await contractManager.owner();

    // Seed the account with ETH so that failure reason is not lack of funds
    await ethers.provider.send("hardhat_setBalance", [
        owner,
        ethers.toBeHex(ethers.parseEther("10"))
    ]);

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
