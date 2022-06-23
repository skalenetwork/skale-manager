import { contracts } from "./deploy";
import { ethers } from "hardhat";
import { SkaleManager } from "../typechain-types";
import { upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction } from "@skalenetwork/upgrade-tools"


async function getSkaleManager(abi: SkaleABIFile) {
    return ((await ethers.getContractFactory("SkaleManager")).attach(
        abi[getContractKeyInAbiFile("SkaleManager") + "_address"] as string
    )) as SkaleManager;
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
        // async (safeTransactions, abi, contractManager) => {
        async (safeTransactions, abi) => {
            const constantsHolder = (await ethers.getContractFactory("ConstantsHolder")).attach(abi["constants_holder_address"] as string);
            const maxNodeDeposit = ethers.utils.parseEther("1.5");
            safeTransactions.push(encodeTransaction(
                0,
                constantsHolder.address,
                0,
                constantsHolder.interface.encodeFunctionData("setMaxNodeDeposit", [maxNodeDeposit]),
            ));
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
