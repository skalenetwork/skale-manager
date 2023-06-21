import { contracts } from "./deploy";
import hre, { ethers, upgrades } from "hardhat";
import chalk from "chalk";
import { Nodes, ProxyAdmin, SchainsInternal, SkaleManager } from "../typechain-types";
import { upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction, verify, getAbi } from "@skalenetwork/upgrade-tools"
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { BigNumber } from "ethers";


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

function getContractsWithout(contractName: string | undefined): string[] {
    if (!contractName) {
        return ["ContractManager"].concat(contracts);
    }
    const index = contracts.indexOf(contractName);
    if (~index) {
        contracts.splice(index, 1);
    }
    return  ["ContractManager"].concat(contracts);
}

function getMappingValueSlot(slot: number, key: number | string) {
    let keyType = 'unknown';
    if (typeof key === 'number') {
        keyType = 'uint256';
    }
    if (typeof key === 'string') {
        keyType = 'bytes32';
    }
    return BigNumber.from(ethers.utils.solidityKeccak256(
        [keyType, 'uint256'],
        [key, slot]
    ));
}

function getArrayValueSlot(arraySlot: BigNumber, index: number) {
    return BigNumber.from(
        ethers.utils.solidityKeccak256(['uint256'], [arraySlot])
    ).add(index);
}

async function main() {
    await upgrade(
        "skale-manager",
        "1.9.2",
        getDeployedVersion,
        setNewVersion,
        ["SkaleManager"],
        getContractsWithout("ConstantsHolder"), // Remove ConstantsHolder from contracts to do upgradeAndCall
        // async (safeTransactions, abi, contractManager) => {
        async () => {
            // deploy new contracts
        },
        async (safeTransactions, abi) => {
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const constantsHolderName = "ConstantsHolder";
            const constantsHolderAddress = abi["constants_holder_address"] as string;
            const constantsHolderFactory = await ethers.getContractFactory(constantsHolderName);

            console.log(`Prepare upgrade of ${constantsHolderName}`);
            const newImplementationAddress = await upgrades.prepareUpgrade(
                constantsHolderAddress,
                constantsHolderFactory
            );
            await verify(constantsHolderName, newImplementationAddress, []);

            // Switch proxies to new implementations
            console.log(chalk.yellowBright(`Prepare transaction to upgradeAndCall ${constantsHolderName} at ${constantsHolderAddress} to ${newImplementationAddress}`));
            const encodedReinitialize = constantsHolderFactory.interface.encodeFunctionData("reinitialize", []);
            safeTransactions.push(encodeTransaction(
                0,
                proxyAdmin.address,
                0,
                proxyAdmin.interface.encodeFunctionData("upgradeAndCall", [constantsHolderAddress, newImplementationAddress, encodedReinitialize])
            ));
            abi[getContractKeyInAbiFile(constantsHolderName) + "_abi"] = getAbi(constantsHolderFactory.interface);

            console.log("Analyze index");
            const nodesAddress = abi["nodes_address"] as string;
            const schainsInternalAddress = abi["schains_internal_address"] as string;
            const nodeToLockedSchainsSlot = 167;

            const nodes = (await ethers.getContractFactory("Nodes", {
                libraries: {
                    SegmentTree: nodesAddress,
                },
              })).attach(nodesAddress) as Nodes;
            const schainsInternal = (await ethers.getContractFactory("SchainsInternal"))
                .attach(schainsInternalAddress) as SchainsInternal;

            // Next loop is pretty time consuming
            // and must be executed only after all transaction are sent
            const nodeIds = [...Array((await nodes.getNumberOfNodes()).toNumber()).keys()];
            for (const nodeId of nodeIds) {
                process.stderr.write(Math.round(nodeId * 100 / nodeIds.length).toString() + "%\r");
                const lockedSchainsSlot = getMappingValueSlot(nodeToLockedSchainsSlot, nodeId);
                const lockedSchainsLength = Number.parseInt(
                    await ethers.provider.getStorageAt(schainsInternal.address, lockedSchainsSlot),
                    16);
                let corrupted = false;
                for (let i = 0; i < lockedSchainsLength; ++i) {
                    const lockedSchainSlot = getArrayValueSlot(lockedSchainsSlot, i);
                    const schainHash = await ethers.provider.getStorageAt(schainsInternal.address, lockedSchainSlot);
                    if (! await schainsInternal.isSchainExist(schainHash)) {
                        corrupted = true;
                        break;
                    }
                }
                if (corrupted) {
                    console.log(chalk.yellowBright(
                        `Add a transaction to fix exceptions of node #${nodeId}`
                    ));
                    safeTransactions.push(encodeTransaction(
                        0,
                        schainsInternal.address,
                        0,
                        schainsInternal.interface.encodeFunctionData("pruneNode", [nodeId])
                    ));
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
