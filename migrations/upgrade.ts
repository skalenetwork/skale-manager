import { contracts } from "./deploy";
import { ethers } from "hardhat";
import { SkaleManager, SchainsInternal } from "../typechain-types";
import { upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction } from "@skalenetwork/upgrade-tools"

import chalk from "chalk";
import { promises as fs } from "fs";


async function getSkaleManager(abi: SkaleABIFile) {
    return ((await ethers.getContractFactory("SkaleManager")).attach(
        abi[getContractKeyInAbiFile("SkaleManager") + "_address"] as string
    )) as SkaleManager;
}

async function getSchainsInternal(abi: SkaleABIFile) {
    return ((await ethers.getContractFactory("SchainsInternal")).attach(
        abi[getContractKeyInAbiFile("SchainsInternal") + "_address"] as string
    )) as SchainsInternal;
}

export async function getDeployedVersion(abi: SkaleABIFile) {
    const skaleManager = await getSkaleManager(abi);
    return await skaleManager.version();
}

export async function setNewVersion(safeTransactions: string[], abi: SkaleABIFile, newVersion: string) {
    const skaleManager = await getSkaleManager(abi);
    safeTransactions.push(encodeTransaction(
        0,
        skaleManager.address,
        0,
        skaleManager.interface.encodeFunctionData("setVersion", [newVersion]),
    ));
}

async function main() {
    await upgrade(
        "skale-manager",
        "1.9.0",
        getDeployedVersion,
        setNewVersion,
        ["SkaleManager", "SchainsInternal"],
        ["ContractManager"].concat(contracts),
        // async (safeTransactions, abi, contractManager) => {
        async () => {
            // deploy new contracts
        },
        async (safeTransactions, abi, contractManager) => {
            const schainsInternal = await getSchainsInternal(abi);
            const numberOfSchains = (await schainsInternal.numberOfSchains()).toNumber();
            if (numberOfSchains > 10) {
                console.log(chalk.redBright("----------------------------Attention----------------------------"));
                console.log(chalk.redBright(`Total schains amount is ${numberOfSchains}`));
                console.log(chalk.redBright("Initialization should be in DIFFERENT safe upgrade transactions"));
            }
            for (let index = 0; index < numberOfSchains / 10 + 1; index++) {
                const schainHashes = [];
                for (let i = 0; i < 10 && index * 10 + i < numberOfSchains; i++) {
                    schainHashes.push(await schainsInternal.schainsAtSystem(index * 10 + i));
                }
                if (index == 0) {
                    safeTransactions.push(encodeTransaction(
                        0,
                        schainsInternal.address,
                        0,
                        schainsInternal.interface.encodeFunctionData("initializeSchainAddresses", [
                            schainHashes
                        ])
                    ));
                } else {
                    const nextSafeTransactions: string[] = [];
                    nextSafeTransactions.push(encodeTransaction(
                        0,
                        schainsInternal.address,
                        0,
                        schainsInternal.interface.encodeFunctionData("initializeSchainAddresses", [
                            schainHashes
                        ])
                    ));
                    await fs.writeFile(`data/transactions-to-initialize-${index}.json`, JSON.stringify(nextSafeTransactions, null, 4));
                }
            }
        }
    );
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
