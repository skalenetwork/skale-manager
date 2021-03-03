import { contracts, getContractKeyInAbiFile, hashBytecode, getManifestName, getContractFactory } from "./deploy";
import { ethers, network, upgrades, run, artifacts } from "hardhat";
import hre from "hardhat";
import { promises as fs } from "fs";
import { ContractManager, Nodes, SchainsInternal, SkaleManager, Wallets } from "../typechain";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";
import { getAbi } from "./tools/abi";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { SafeMock } from "../typechain/SafeMock";
import { encodeTransaction } from "./tools/multiSend";
import { createMultiSendTransaction, getSafeRelayUrl, getSafeTransactionUrl, sendSafeTransaction } from "./tools/gnosis-safe";
import chalk from "chalk";
import { verify, verifyProxy } from "./tools/verification";
import { getVersion } from "./tools/version";

export async function getAndUpgradeContractFactory(contract: string) {
    const manifest = JSON.parse(await fs.readFile(`.openzeppelin/${await getManifestName()}.json`, "utf-8"));
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
    for (const libraryName of Object.keys(libraries)) {
        const { bytecode } = await artifacts.readArtifact(libraryName);
        manifest.libraries[libraryName] = {"address": libraries[libraryName], "bytecodeHash": hashBytecode(bytecode)};
    }
    Object.assign(libraries, oldLibraries);
    await fs.writeFile(`.openzeppelin/${await getManifestName()}.json`, JSON.stringify(manifest, null, 4));
    return await getLinkedContractFactory(contract, libraries);
}

type DeploymentAction = (safeTransactions: string[], abi: any, contractManager: ContractManager) => Promise<void>;

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
    const abi = JSON.parse(await fs.readFile(abiFilename, "utf-8"));

    const proxyAdmin = await getManifestAdmin(hre);
    const contractManagerName = "ContractManager";
    const contractManagerFactory = await ethers.getContractFactory(contractManagerName);
    const contractManager = (contractManagerFactory.attach(abi[getContractKeyInAbiFile(contractManagerName) + "_address"])) as ContractManager;
    const skaleManagerName = "SkaleManager";
    const skaleManager = ((await ethers.getContractFactory(skaleManagerName)).attach(
        abi[getContractKeyInAbiFile(skaleManagerName) + "_address"]
    )) as SkaleManager;

    let deployedVersion = "";
    try {
        deployedVersion = await skaleManager.version();
    } catch {
        console.log("Can't read deployed version");
    };
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
                .filter(name => !['ContractManager', 'TimeHelpers', 'Decryption', 'ECDH', 'Wallets'].includes(name)))) {
                    const contractFactory = await getContractFactory(contractName);
                    let _contract = contractName;
                    if (contractName === "BountyV2") {
                        if (!abi[getContractKeyInAbiFile(contractName) + "_address"])
                        _contract = "Bounty";
                    }
                    const contractAddress = abi[getContractKeyInAbiFile(_contract) + "_address"];
                    const contract = contractFactory.attach(contractAddress);
                    console.log(chalk.blue(`Grant access to ${contractName}`));
                    await (await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), safe)).wait();
        }
    }

    // Deploy new contracts
    await deployNewContracts(safeTransactions, abi, contractManager);

    // deploy new implementations
    const contractsToUpgrade: {proxyAddress: string, implementationAddress: string, name: string, abi: any}[] = [];
    for (const contract of contractNamesToUpgrade) {
        const contractFactory = await getAndUpgradeContractFactory(contract);
        let _contract = contract;
        if (contract === "BountyV2") {
            if (!abi[getContractKeyInAbiFile(contract) + "_address"])
            _contract = "Bounty";
        }
        const proxyAddress = abi[getContractKeyInAbiFile(_contract) + "_address"];

        console.log(`Prepare upgrade of ${contract}`);
        const newImplementationAddress = await upgrades.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        const currentImplementationAddress = await getImplementationAddress(network.provider, proxyAddress);
        if (newImplementationAddress !== currentImplementationAddress)
        {
            contractsToUpgrade.push({
                proxyAddress,
                implementationAddress: newImplementationAddress,
                name: contract,
                abi: getAbi(contractFactory.interface)
            });
            await verify(contract, newImplementationAddress);
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
    // remove Wallets from list
    contracts.pop();

    await upgrade(
        "1.7.2-stable.0",
        ["ContractManager"].concat(contracts),
        async (safeTransactions, abi, contractManager) => {
            const safe = await contractManager.owner();
            const [ deployer ] = await ethers.getSigners();

            // Deploy Wallets
            const walletsName = "Wallets";
            console.log(chalk.green("Deploy", walletsName));
            const walletsFactory = await ethers.getContractFactory(walletsName);
            const wallets = (await upgrades.deployProxy(walletsFactory, [contractManager.address])) as Wallets;
            await wallets.deployTransaction.wait();
            console.log(chalk.green("Transfer ownership"));
            await (await wallets.grantRole(await wallets.DEFAULT_ADMIN_ROLE(), safe)).wait();
            await (await wallets.revokeRole(await wallets.DEFAULT_ADMIN_ROLE(), deployer.address)).wait();
            console.log(chalk.yellowBright("Prepare transaction to register", walletsName));
            safeTransactions.push(encodeTransaction(
                0,
                contractManager.address,
                0,
                contractManager.interface.encodeFunctionData("setContractsAddress", [walletsName, wallets.address])
            ));
            abi[getContractKeyInAbiFile(walletsName) + "_address"] = wallets.address;
            abi[getContractKeyInAbiFile(walletsName) + "_abi"] = getAbi(wallets.interface);
            await verifyProxy(walletsName, wallets.address);
        },
        async (safeTransactions, abi) => {

            // Initialize SegmentTree in Nodes
            const nodesName = "Nodes";
            const nodesContractFactory = await getContractFactory(nodesName);
            const nodesAddress = abi[getContractKeyInAbiFile(nodesName) + "_address"];
            if (nodesAddress) {
                console.log(chalk.yellowBright("Prepare transaction to initialize", nodesName));
                const nodes = (nodesContractFactory.attach(nodesAddress)) as Nodes;
                safeTransactions.push(encodeTransaction(
                    0,
                    nodes.address,
                    0,
                    nodes.interface.encodeFunctionData("initializeSegmentTreeAndInvisibleNodes")
                ));
            } else {
                console.log(chalk.red("Nodes address was not found!"));
                console.log(chalk.red("Check your abi!"));
                process.exit(1);
            }

            // Initialize schain types
            const schainsInternalName = "SchainsInternal";
            const schainsInternalFactory = await getContractFactory(schainsInternalName);
            const schainsInternalAddress = abi[getContractKeyInAbiFile(schainsInternalName) + "_address"];
            if (schainsInternalAddress) {
                console.log(chalk.yellowBright("Prepare transactions to initialize schains types"));
                const schainsInternal = (schainsInternalFactory.attach(schainsInternalAddress)) as SchainsInternal;
                console.log(chalk.yellowBright("Number of Schain types will be set to 0"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("setNumberOfSchainTypes", [0]),
                ));

                console.log(chalk.yellowBright("Schain Type Small will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [1, 16]),
                ));

                console.log(chalk.yellowBright("Schain Type Medium will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [4, 16]),
                ));

                console.log(chalk.yellowBright("Schain Type Large will be added"));
                safeTransactions.push(encodeTransaction(
                    0,
                    schainsInternal.address,
                    0,
                    schainsInternal.interface.encodeFunctionData("addSchainType", [128, 16]),
                ));
            }
        });
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
