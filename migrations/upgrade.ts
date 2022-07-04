import { contracts } from "./deploy";
import { ethers } from "hardhat";
import { SkaleManager, SchainsInternal } from "../typechain-types";
import { upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction } from "@skalenetwork/upgrade-tools"

import chalk from "chalk";


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
        async (safeTransactions, abi) => {
            const schainsInternal = await getSchainsInternal(abi);
            const numberOfSchains = (await schainsInternal.numberOfSchains()).toNumber();
            const schainLimitPerTransaction = 10;
            if (numberOfSchains > 0) {
                let limitOfSchains = schainLimitPerTransaction;
                if (numberOfSchains < schainLimitPerTransaction) {
                    limitOfSchains = numberOfSchains;
                }
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("initializeSchainAddresses", [
                        0,
                        limitOfSchains
                    ])
                ));
            }
        },
        async (abi) => {
            const schainsInternal = await getSchainsInternal(abi);
            const numberOfSchains = (await schainsInternal.numberOfSchains()).toNumber();
            const schainLimitPerTransaction = 10;
            const nextSafeTransactions: string[][] = [];
            if (numberOfSchains > schainLimitPerTransaction) {
                console.log(chalk.redBright("---------------------------Attention---------------------------"));
                console.log(chalk.redBright(`Total schains amount is ${numberOfSchains}`));
                console.log(chalk.redBright("Initialization should be in DIFFERENT safe upgrade transactions"));
                for (let step = 1; step * schainLimitPerTransaction < numberOfSchains; step++) {
                    let limitOfSchains = step * schainLimitPerTransaction + schainLimitPerTransaction;
                    if (numberOfSchains < limitOfSchains) {
                        limitOfSchains = numberOfSchains;
                    }
                    nextSafeTransactions.push([encodeTransaction(
                        0,
                        schainsInternal.address,
                        0,
                        schainsInternal.interface.encodeFunctionData("initializeSchainAddresses", [
                            step * schainLimitPerTransaction,
                            limitOfSchains
                        ])
                    )]);
                }
            }
            return nextSafeTransactions;
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
