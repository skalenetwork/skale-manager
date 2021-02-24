import { contracts, getContractKeyInAbiFile, getContractFactory } from "./deploy";
import { ethers, network, upgrades, run } from "hardhat";
import hre from "hardhat";
import { promises as fs } from "fs";
import { ContractManager, Nodes, SchainsInternal, Wallets } from "../typechain";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { getAbi } from "./tools/abi";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { SafeMock } from "../typechain/SafeMock";
import { encodeTransaction } from "./tools/multiSend";
import { createMultiSendTransaction, getSafeRelayUrl, getSafeTransactionUrl, sendSafeTransaction } from "./tools/gnosis-safe";
import axios from "axios";
import chalk from "chalk";
import { verify, verifyProxy } from "./tools/verification";


async function main() {
    if ((await fs.readFile("DEPLOYED", "utf-8")).trim() !== "1.7.2-stable.0") {
        console.log(chalk.red("Upgrade script is not relevant"));
        process.exit(1);
    }

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
        safeMock.deployTransaction.wait();

        console.log(chalk.blue("Transfer ownership to SafeMock"));
        safe = safeMock.address;
        await (await proxyAdmin.transferOwnership(safe)).wait();
        await (await contractManager.transferOwnership(safe)).wait();
    }

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

    // remove Wallets from list
    contracts.pop();

    // deploy new implementations
    const contractsToUpgrade: {proxyAddress: string, implementationAddress: string, name: string, abi: any}[] = [];
    for (const contract of ["ContractManager"].concat(contracts)) {
        const contractFactory = await getContractFactory(contract);
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

    // Initialize SegmentTree in Nodes
    const nodesName = "Nodes";
    const nodesContractFactory = await getContractFactory(nodesName);
    const nodesAddress = abi[getContractKeyInAbiFile(nodesName) + "_address"];
    if (nodesAddress) {
        console.log(chalk.yellowBright("Prepare transaction to initialize", nodesName));
        const nodes = (nodesContractFactory.attach(nodesAddress)) as Nodes;
        if (safeMock) {
            console.log(chalk.blue("Grant access to initialize nodes"));
            await (await nodes.grantRole(await nodes.DEFAULT_ADMIN_ROLE(), safe)).wait();
        }
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
        if (safeMock) {
            console.log(chalk.blue("Grant access to initialize schains types"));
            await (await schainsInternal.grantRole(await schainsInternal.DEFAULT_ADMIN_ROLE(), safe)).wait();
        }
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

    let privateKey = (network.config.accounts as string[])[0];
    if (network.config.accounts === "remote") {
        // Don't have an information about private key
        // Use random one because we most probable run tests
        privateKey = ethers.Wallet.createRandom().privateKey;
    }

    const version = (await fs.readFile("VERSION", "utf-8")).trim();
    await fs.writeFile(`data/transactions-${version}-${network.name}.json`, JSON.stringify(safeTransactions, null, 4));

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

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
