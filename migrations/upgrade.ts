import chalk from "chalk";
import { contracts } from "./deploy";
import { ethers } from "hardhat";
import { Upgrader, AutoSubmitter } from "@skalenetwork/upgrade-tools";
import { skaleContracts, Instance } from "@skalenetwork/skale-contracts-ethers-v5";
import { SkaleManager } from "../typechain-types";

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
        submitter = new AutoSubmitter()) {
            super(
                "skale-manager",
                targetVersion,
                instance,
                contractNamesToUpgrade,
                submitter);
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
        this.transactions.push({
            to: skaleManager.address,
            data: skaleManager.interface.encodeFunctionData("setVersion", [newVersion])
        });
    }

    // deployNewContracts = () => { };

    // initialize = async () => { };
}

async function main() {
    const upgrader = new SkaleManagerUpgrader(
        "1.9.3",
        await getSkaleManagerInstance(),
        contracts,
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
