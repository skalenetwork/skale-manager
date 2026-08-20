import {promises as fs} from 'fs';
import {ethers, upgrades, network, run} from "hardhat";
import {
    getAbi,
    getVersion,
    verify,
    verifyProxy,
    getContractFactory,
} from '@skalenetwork/upgrade-tools';
import {BaseContract, Interface, resolveAddress} from 'ethers';
import {isDevelopmentNetwork, TransactionMinedTimeout} from "@openzeppelin/upgrades-core";
import {SkaleManager} from '../typechain-types';


export async function shouldCalculateGas() {
    return await isLocalNetwork() || process.env.CALCULATE_GAS === "true";
}

export async function isLocalNetwork() {
    let result = false;
    try {
        result = await isDevelopmentNetwork(ethers.provider);
    } catch {
        console.error("Failed to detect network type, assuming non-development network");
    }
    return result;
}

export async function calculateGasSpent(startBlock: number, endBlock: number, user: string) {
    let totalGasUsed = BigInt(0);
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        const block = await ethers.provider.getBlock(blockNumber, true);
        if (block === null) throw new Error(`Block ${blockNumber} not found`);
        for (const txHash of block.transactions) {
            const tx = await ethers.provider.getTransactionReceipt(txHash);
            if (tx === null) throw new Error(`Transaction ${txHash} not found`);
            if (ethers.getAddress(tx.from) === ethers.getAddress(user)) {
                totalGasUsed += BigInt(tx.gasUsed);
            }
        }
    }
    return totalGasUsed;
}

function getInitializerParameters(contract: string, contractManagerAddress: string) {
    if (["TimeHelpers", "Decryption", "ECDH"].includes(contract)) {
        return undefined;
    } else if (["TimeHelpersWithDebug"].includes(contract)) {
        return [];
    } else {
        return [contractManagerAddress];
    }
}

function getNameInContractManager(contract: string) {
    if (Object.keys(customNames).includes(contract)) {
        return customNames[contract];
    } else {
        return contract;
    }
}

function getContractKeyInAbiFile(contract: string) {
    return contract.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
}

const customNames: {[key: string]: string} = {
    "TimeHelpersWithDebug": "TimeHelpers",
    "BountyV2": "Bounty"
}

export const contracts = [
    "ContractManager",

    "DelegationController",
    "DelegationPeriodManager",
    "Distributor",
    "Punisher",
    "SlashingTable",
    "TimeHelpers",
    "TokenState",
    "ValidatorService",

    "ConstantsHolder",
    "Nodes",
    "NodeRotation",
    "DKR",
    "SchainsInternal",
    "Schains",
    "Decryption",
    "ECDH",
    "KeyStorage",
    "SkaleDKG",
    "SkaleVerifier",
    "SkaleManager",
    "BountyV2",
    "Wallets",
    "SyncManager",
    "PaymasterController"
]

async function main() {
    const [ owner,] = await ethers.getSigners();
    if (await ethers.provider.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
        await run("erc1820");
    }
    const startBlock = await ethers.provider.getBlockNumber();
    let production = false;

    if (process.env.PRODUCTION === "true") {
        production = true;
    } else if (process.env.PRODUCTION === "false") {
        production = false;
    }

    if (!production) {
        contracts.push("TimeHelpersWithDebug");
    }

    const version = await getVersion();
    const contractArtifacts: {address: string, interface: Interface, contract: string}[] = [];

    const contractManagerName = "ContractManager";
    console.log("Deploy", contractManagerName);
    const contractManagerFactory = await ethers.getContractFactory(contractManagerName);
    const contractManager = await upgrades.deployProxy(contractManagerFactory, []);
    await contractManager.waitForDeployment();
    console.log("Register", contractManagerName);
    await (await contractManager.setContractsAddress(contractManagerName, contractManager)).wait();
    contractArtifacts.push({address: await contractManager.getAddress(), interface: contractManager.interface, contract: contractManagerName})

    for (const contract of contracts.filter(contractName => contractName != "ContractManager")) {
        const contractFactory = await getContractFactory(contract);
        console.log("Deploy", contract);
        let attempts = 5;
        let proxy: BaseContract | undefined = undefined;
        while (attempts --> 0 && typeof proxy === "undefined") {
            try {
                proxy = await upgrades.deployProxy(
                    contractFactory,
                    getInitializerParameters(contract, await resolveAddress(contractManager)),
                    {
                        unsafeAllowLinkedLibraries: true
                    }
                );
                await proxy.waitForDeployment();
            } catch (e) {
                if (e instanceof TransactionMinedTimeout) {
                    console.log(e);
                    console.log("Retrying");
                } else {
                    throw e;
                }
            }
        }
        if (!proxy) {
            throw new Error(`Error during deployment of ${contract}`);
        }
        const contractName = getNameInContractManager(contract);
        const proxyAddress = await resolveAddress(proxy);
        console.log("Register", contract, "as", contractName, "=>", proxyAddress);
        const transaction = await contractManager.setContractsAddress(contractName, proxy);
        await transaction.wait();
        contractArtifacts.push({address: proxyAddress, interface: proxy.interface, contract});

        if (contract === "SkaleManager") {
            try {
                console.log(`Set version ${version}`)
                await (await (proxy as SkaleManager).setVersion(version)).wait();
            } catch {
                console.log("Failed to set skale-manager version");
            }
        }
    }

    const skaleTokenName = "SkaleToken";
    console.log("Deploy", skaleTokenName);
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManager, []);
    await skaleToken.waitForDeployment();
    console.log("Register", skaleTokenName);
    await (await contractManager.setContractsAddress(skaleTokenName, skaleToken)).wait();
    contractArtifacts.push({address: await skaleToken.getAddress(), interface: skaleToken.interface, contract: skaleTokenName});

    if (!production) {
        console.log("Do actions for non production deployment");
        // In non-production environment, owner has minter role by default and mints some tokens to himself
        await (await skaleToken.grantRole(await skaleToken.MINTER_ROLE(), owner.address)).wait();
        const money = "5000000000000000000000000000"; // 5e9 * 1e18
        await skaleToken.mint(owner.address, money, "0x", "0x");
    }

    // Grant MINTER_ROLE to SkaleManager
    await (await skaleToken.grantRole(await skaleToken.MINTER_ROLE(), await contractManager.getContract("SkaleManager"))).wait();

    console.log("Store addresses");

    const addressesOutput: {[name: string]: string} = {};
    for (const artifact of contractArtifacts) {
        addressesOutput[artifact.contract] = artifact.address;
    }
    await fs.writeFile(`data/skale-manager-${version}-${network.name}-contracts.json`, JSON.stringify(addressesOutput, null, 4));


    // TODO: remove storing of ABIs to a file

    console.log("Store ABIs");

    const outputObject: {[k: string]: unknown} = {};
    for (const artifact of contractArtifacts) {
        const contractKey = getContractKeyInAbiFile(artifact.contract);
        outputObject[contractKey + "_address"] = artifact.address;
        outputObject[contractKey + "_abi"] = getAbi(artifact.interface);
    }

    await fs.writeFile(`data/skale-manager-${version}-${network.name}-abi.json`, JSON.stringify(outputObject, null, 4));

    console.log("Verify contracts");
    for (const artifact of contractArtifacts) {
        if (artifact.contract === skaleTokenName) {
            // Encode constructor arguments: address contractsAddress, address[] memory defOps
            const constructorArguments = ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "address[]"],
                [await contractManager.getAddress(), []]
            );
            await verify(skaleTokenName, await skaleToken.getAddress(), constructorArguments);
        } else {
            await verifyProxy(artifact.contract, artifact.address)
        }
    }

    console.log("Done");

    if (await shouldCalculateGas()) {
        console.log("Calculating gas used by deployer", owner.address);
        const endBlock = await ethers.provider.getBlockNumber();
        const gasUsed = await calculateGasSpent(startBlock, endBlock, owner.address);
        console.log(`Gas used by deployer: ${gasUsed}`);
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
