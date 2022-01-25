import { contracts, getContractKeyInAbiFile, getManifestFile, getContractFactory } from "./deploy";
import { ethers, network, upgrades, artifacts } from "hardhat";
import hre from "hardhat";
import { promises as fs } from "fs";
import { ContractManager, Permissions, SchainsInternal, SkaleManager, SyncManager } from "../typechain-types";
import { ProxyAdmin } from "../typechain-types/ProxyAdmin";
import { getImplementationAddress, hashBytecode } from "@openzeppelin/upgrades-core";
import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";
import { getAbi } from "./tools/abi";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { SafeMock } from "../typechain-types/SafeMock";
import { encodeTransaction } from "./tools/multiSend";
import { createMultiSendTransaction, sendSafeTransaction } from "./tools/gnosis-safe";
import chalk from "chalk";
import { verify, verifyProxy } from "./tools/verification";
import { getVersion } from "./tools/version";
import { SkaleABIFile, SkaleManifestData } from "./tools/types";

export async function getContractFactoryAndUpdateManifest(contract: string) {
    const manifest = JSON.parse(await fs.readFile(await getManifestFile(), "utf-8")) as SkaleManifestData;
    const { linkReferences } = await artifacts.readArtifact(contract);
    if (!Object.keys(linkReferences).length)
        return await ethers.getContractFactory(contract);

    const librariesToUpgrade = [];
    const oldLibraries: {[k: string]: string} = {};
    if (manifest.libraries === undefined) {
        Object.assign(manifest, {libraries: {}});
    }
    for (const key of Object.keys(linkReferences)) {
        const libraryName = Object.keys(linkReferences[key])[0];
        const { bytecode } = await artifacts.readArtifact(libraryName);
        if (manifest.libraries[libraryName] === undefined) {
            librariesToUpgrade.push(libraryName);
            continue;
        }
        const libraryBytecodeHash = manifest.libraries[libraryName].bytecodeHash;
        if (hashBytecode(bytecode) !== libraryBytecodeHash) {
            librariesToUpgrade.push(libraryName);
        } else {
            oldLibraries[libraryName] = manifest.libraries[libraryName].address;
        }
    }
    const libraries = await deployLibraries(librariesToUpgrade);
    for (const [libraryName, libraryAddress] of libraries.entries()) {
        const { bytecode } = await artifacts.readArtifact(libraryName);
        manifest.libraries[libraryName] = {"address": libraryAddress, "bytecodeHash": hashBytecode(bytecode)};
    }
    Object.assign(libraries, oldLibraries);
    await fs.writeFile(await getManifestFile(), JSON.stringify(manifest, null, 4));
    return await getLinkedContractFactory(contract, libraries);
}

type DeploymentAction = (safeTransactions: string[], abi: SkaleABIFile, contractManager: ContractManager) => Promise<void>;

export async function upgrade(
    targetVersion: string,
    contractNamesToUpgrade: string[],
    deployNewContracts: DeploymentAction,
    initialize: DeploymentAction)
{
    if (!process.env.ABI) {
        console.log(chalk.red("Set path to file with ABI and addresses to ABI environment variables"));
        return;
    }

    const abiFilename = process.env.ABI;
    const abi = JSON.parse(await fs.readFile(abiFilename, "utf-8")) as SkaleABIFile;

    const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
    const contractManagerName = "ContractManager";
    const contractManagerFactory = await ethers.getContractFactory(contractManagerName);
    const contractManager = (contractManagerFactory.attach(abi[getContractKeyInAbiFile(contractManagerName) + "_address"] as string)) as ContractManager;
    const skaleManagerName = "SkaleManager";
    const skaleManager = ((await ethers.getContractFactory(skaleManagerName)).attach(
        abi[getContractKeyInAbiFile(skaleManagerName) + "_address"] as string
    )) as SkaleManager;

    let deployedVersion = "";
    try {
        deployedVersion = await skaleManager.version();
    } catch {
        console.log("Can't read deployed version");
    }
    const version = await getVersion();
    if (deployedVersion) {
        if (deployedVersion !== targetVersion) {
            console.log(chalk.red(`This script can't upgrade version ${deployedVersion} to ${version}`));
            process.exit(1);
        }
    } else {
        console.log(chalk.yellow("Can't check currently deployed version of skale-manager"));
    }
    console.log(`Will mark updated version as ${version}`);

    const [ deployer ] = await ethers.getSigners();
    let safe = await proxyAdmin.owner();
    const safeTransactions: string[] = [];
    let safeMock;
    if (await ethers.provider.getCode(safe) === "0x") {
        console.log("Owner is not a contract");
        if (deployer.address !== safe) {
            console.log(chalk.red("Used address does not have permissions to upgrade skale-manager"));
            process.exit(1);
        }
        console.log(chalk.blue("Deploy SafeMock to simulate upgrade via multisig"));
        const safeMockFactory = await ethers.getContractFactory("SafeMock");
        safeMock = (await safeMockFactory.deploy()) as SafeMock;
        await safeMock.deployTransaction.wait();

        console.log(chalk.blue("Transfer ownership to SafeMock"));
        safe = safeMock.address;
        await (await proxyAdmin.transferOwnership(safe)).wait();
        await (await contractManager.transferOwnership(safe)).wait();
        for (const contractName of
            ["SkaleToken"].concat(contractNamesToUpgrade
                .filter(name => !['ContractManager', 'TimeHelpers', 'Decryption', 'ECDH', 'SyncManager'].includes(name)))) {
                    const contractFactory = await getContractFactoryAndUpdateManifest(contractName);
                    let _contract = contractName;
                    if (contractName === "BountyV2") {
                        if (!abi[getContractKeyInAbiFile(contractName) + "_address"])
                        _contract = "Bounty";
                    }
                    const contractAddress = abi[getContractKeyInAbiFile(_contract) + "_address"] as string;
                    const contract = contractFactory.attach(contractAddress) as Permissions;
                    console.log(chalk.blue(`Grant access to ${contractName}`));
                    await (await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), safe)).wait();
        }
    }

    // Deploy new contracts
    await deployNewContracts(safeTransactions, abi, contractManager);

    // deploy new implementations
    const contractsToUpgrade: {proxyAddress: string, implementationAddress: string, name: string, abi: []}[] = [];
    for (const contract of contractNamesToUpgrade) {
        const contractFactory = await getContractFactoryAndUpdateManifest(contract);
        let _contract = contract;
        if (contract === "BountyV2") {
            if (!abi[getContractKeyInAbiFile(contract) + "_address"])
            _contract = "Bounty";
        }
        const proxyAddress = abi[getContractKeyInAbiFile(_contract) + "_address"] as string;

        console.log(`Prepare upgrade of ${contract}`);
        const newImplementationAddress = await upgrades.prepareUpgrade(
            proxyAddress,
            contractFactory,
            {
                unsafeAllowLinkedLibraries: true,
                unsafeAllowRenames: true
            }
        );
        const currentImplementationAddress = await getImplementationAddress(network.provider, proxyAddress);
        if (newImplementationAddress !== currentImplementationAddress)
        {
            contractsToUpgrade.push({
                proxyAddress,
                implementationAddress: newImplementationAddress,
                name: contract,
                abi: getAbi(contractFactory.interface)
            });
            await verify(contract, newImplementationAddress, []);
        } else {
            console.log(chalk.gray(`Contract ${contract} is up to date`));
        }
    }

    // Switch proxies to new implementations
    for (const contract of contractsToUpgrade) {
        console.log(chalk.yellowBright(`Prepare transaction to upgrade ${contract.name} at ${contract.proxyAddress} to ${contract.implementationAddress}`));
        safeTransactions.push(encodeTransaction(
            0,
            proxyAdmin.address,
            0,
            proxyAdmin.interface.encodeFunctionData("upgrade", [contract.proxyAddress, contract.implementationAddress])));
        abi[getContractKeyInAbiFile(contract.name) + "_abi"] = contract.abi;
    }

    await initialize(safeTransactions, abi, contractManager);

    // write version
    if (safeMock) {
        console.log(chalk.blue("Grant access to set version"));
        await (await skaleManager.grantRole(await skaleManager.DEFAULT_ADMIN_ROLE(), safe)).wait();
    }
    safeTransactions.push(encodeTransaction(
        0,
        skaleManager.address,
        0,
        skaleManager.interface.encodeFunctionData("setVersion", [version]),
    ));

    await fs.writeFile(`data/transactions-${version}-${network.name}.json`, JSON.stringify(safeTransactions, null, 4));

    let privateKey = (network.config.accounts as string[])[0];
    if (network.config.accounts === "remote") {
        // Don't have an information about private key
        // Use random one because we most probable run tests
        privateKey = ethers.Wallet.createRandom().privateKey;
    }

    const safeTx = await createMultiSendTransaction(ethers, safe, privateKey, safeTransactions);
    if (!safeMock) {
        const chainId = (await ethers.provider.getNetwork()).chainId;
        await sendSafeTransaction(safe, chainId, safeTx);
    } else {
        console.log(chalk.blue("Send upgrade transactions to safe mock"));
        try {
            await (await deployer.sendTransaction({
                to: safeMock.address,
                value: safeTx.value,
                data: safeTx.data,
            })).wait();
        } finally {
            console.log(chalk.blue("Return ownership to wallet"));
            await (await safeMock.transferProxyAdminOwnership(contractManager.address, deployer.address)).wait();
            await (await safeMock.transferProxyAdminOwnership(proxyAdmin.address, deployer.address)).wait();
            if (await proxyAdmin.owner() === deployer.address) {
                await (await safeMock.destroy()).wait();
            } else {
                console.log(chalk.blue("Something went wrong with ownership transfer"));
                process.exit(1);
            }
        }
    }

    await fs.writeFile(`data/skale-manager-${version}-${network.name}-abi.json`, JSON.stringify(abi, null, 4));

    console.log("Done");
}

async function main() {
    await upgrade(
        "1.8.2",
        ["ContractManager"].concat(contracts),
        async (safeTransactions, abi, contractManager) => {
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
