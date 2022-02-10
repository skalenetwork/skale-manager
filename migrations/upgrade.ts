import { contracts } from "./deploy";
import { ethers, upgrades } from "hardhat";
import { ContractManager, SchainsInternal, SkaleManager, SyncManager } from "../typechain-types";
import { getAbi, upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction, getContractFactory, verifyProxy } from "@skalenetwork/upgrade-tools"
import chalk from "chalk";


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
        "1.8.2",
        getDeployedVersion,
        setNewVersion,
        ["ContractManager"].concat(contracts),
        ["SkaleManager"],
        async (safeTransactions: string[], abi: SkaleABIFile, contractManager: ContractManager) => {
            const safe = await contractManager.owner();
            const [ deployer ] = await ethers.getSigners();

            const syncManagerName = "SyncManager";
            const syncManagerFactory = await getContractFactory(syncManagerName);
            console.log("Deploy", syncManagerName);
            const syncManager = (await upgrades.deployProxy(syncManagerFactory, [contractManager.address])) as SyncManager;
            await syncManager.deployTransaction.wait();
            await (await syncManager.grantRole(await syncManager.DEFAULT_ADMIN_ROLE(), safe)).wait();
            await (await syncManager.revokeRole(await syncManager.DEFAULT_ADMIN_ROLE(), deployer.address)).wait();
            console.log(chalk.yellowBright("Prepare transaction to register", syncManagerName));
            console.log("Register", syncManagerName, "as", syncManagerName, "=>", syncManager.address);
            safeTransactions.push(encodeTransaction(
                0,
                contractManager.address,
                0,
                contractManager.interface.encodeFunctionData("setContractsAddress", [syncManagerName, syncManager.address]),
            ));
            await verifyProxy(syncManagerName, syncManager.address, []);
            abi[getContractKeyInAbiFile(syncManagerName) + "_abi"] = getAbi(syncManager.interface);
            abi[getContractKeyInAbiFile(syncManagerName) + "_address"] = syncManager.address;
        },
        async (safeTransactions, abi, contractManager) => {
            const schainsInternal = (await ethers.getContractFactory("SchainsInternal"))
                .attach(await contractManager.getContract("SchainsInternal")) as SchainsInternal;
            const GENERATION_MANAGER_ROLE = ethers.utils.solidityKeccak256(["string"], ["GENERATION_MANAGER_ROLE"])
            safeTransactions.push(encodeTransaction(
                0,
                schainsInternal.address,
                0,
                schainsInternal.interface.encodeFunctionData("grantRole", [
                    GENERATION_MANAGER_ROLE,
                    await contractManager.owner()
                ])
            ));
            console.log(chalk.yellowBright("Prepare transaction to switch generation"));
            safeTransactions.push(encodeTransaction(
                0,
                schainsInternal.address,
                0,
                schainsInternal.interface.encodeFunctionData("newGeneration"),
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
