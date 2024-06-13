import chalk from "chalk";
import { contracts } from "./deploy";
import { promises as fs } from "fs";
import { ethers } from "hardhat";
import { Upgrader, AutoSubmitter } from "@skalenetwork/upgrade-tools";
import { SkaleABIFile } from "@skalenetwork/upgrade-tools/dist/src/types/SkaleABIFile";
import { SkaleManager } from "../typechain-types";

async function getSkaleManagerAbiAndAddresses(): Promise<SkaleABIFile> {
    if (!process.env.ABI) {
        console.log(chalk.red("Set path to file with ABI and addresses to ABI environment variables"));
        process.exit(1);
    }
    const abiFilename = process.env.ABI;
    return JSON.parse(await fs.readFile(abiFilename, "utf-8")) as SkaleABIFile;
}

class SkaleManagerUpgrader extends Upgrader {

    constructor(
        targetVersion: string,
        abi: SkaleABIFile,
        contractNamesToUpgrade: string[],
        submitter = new AutoSubmitter()) {
            super(
                "skale-manager",
                targetVersion,
                abi,
                contractNamesToUpgrade,
                submitter);
        }

    async getSkaleManager() {
        return await ethers.getContractAt("SkaleManager", this.abi.skale_manager_address as string) as SkaleManager;
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
    let contractsToUpgrade = [
        "Nodes",
        "Schains",
        "ValidatorService"
    ];
    if (process.env.UPGRADE_ALL) {
        contractsToUpgrade = contracts;
    }
    const upgrader = new SkaleManagerUpgrader(
        "1.10.0",
        await getSkaleManagerAbiAndAddresses(),
        contractsToUpgrade,
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
