import chalk from "chalk";
import { contracts } from "./deploy";
import { BigNumber } from "ethers";
import { promises as fs } from "fs";
import hre, { ethers, upgrades } from "hardhat";
import { Upgrader } from "@skalenetwork/upgrade-tools";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { verify, getAbi } from "@skalenetwork/upgrade-tools"
import { SkaleABIFile } from "@skalenetwork/upgrade-tools/dist/src/types/SkaleABIFile";
import { Nodes, ProxyAdmin, SchainsInternal, SkaleManager } from "../typechain-types";

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

async function getSkaleManagerAbiAndAddresses(): Promise<SkaleABIFile> {
    if (!process.env.ABI) {
        console.log(chalk.red("Set path to file with ABI and addresses to ABI environment variables"));
        process.exit(1);
    }
    const abiFilename = process.env.ABI;
    return JSON.parse(await fs.readFile(abiFilename, "utf-8")) as SkaleABIFile;
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



class SkaleManagerUpgrader extends Upgrader {

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

    initialize = async () => {
        const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
        const constantsHolderName = "ConstantsHolder";
        const constantsHolderAddress = this.abi["constants_holder_address"] as string;
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
        this.transactions.push({
            to: proxyAdmin.address,
            data: proxyAdmin.interface.encodeFunctionData("upgradeAndCall", [constantsHolderAddress, newImplementationAddress, encodedReinitialize])
        });
        this.abi[this._getContractKeyInAbiFile(constantsHolderName) + "_abi"] = getAbi(constantsHolderFactory.interface);

        console.log("Analyze index");
        const nodesAddress = this.abi["nodes_address"] as string;
        const schainsInternalAddress = this.abi["schains_internal_address"] as string;
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
                this.transactions.push({
                    to: schainsInternal.address,
                    data: schainsInternal.interface.encodeFunctionData("pruneNode", [nodeId])
                });
            }
        }
    }

}

async function main() {
    const upgrader = new SkaleManagerUpgrader(
        "skale-manager",
        "1.9.2",
        await getSkaleManagerAbiAndAddresses(),
        getContractsWithout("ConstantsHolder"), // Remove ConstantsHolder from contracts to do upgradeAndCall
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