import { promises as fs } from 'fs';
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades, network, run } from "hardhat";
import { ContractManager } from "../typechain";
import { ContractFactory } from 'ethers';
import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";
import { getAbi } from './tools/abi';
import { verify, verifyProxy } from './tools/verification';

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

async function getContractFactoryWithLibraries(e: any, contractName: string) {
    const libraryNames = [];
    for (const str of e.toString().split(".sol:")) {
        const libraryName = str.split("\n")[0];
        libraryNames.push(libraryName);
    }
    libraryNames.shift();
    const libraries = await deployLibraries(libraryNames);
    const contractFactory = await getLinkedContractFactory(contractName, libraries);
    return contractFactory;
}

export function getContractKeyInAbiFile(contract: string) {
    return contract.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
}

const customNames: {[key: string]: string} = {
    "TimeHelpersWithDebug": "TimeHelpers",
    "BountyV2": "Bounty"
}

export async function getContractFactory(contract: string) {
    let contractFactory: ContractFactory;
    try {
        contractFactory = await ethers.getContractFactory(contract);
    } catch (e) {
        const linkingErrorMessage = "The contract " + contract + " is missing links for the following libraries";
        if (e.toString().includes(linkingErrorMessage)) {
            contractFactory = await getContractFactoryWithLibraries(e, contract);
        } else {
            throw(e);
        }
    }
    return contractFactory;
}

export const contracts = [
    // "ContractManager", // it will be deployed explicitly

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
    "SchainsInternal",
    "Schains",
    "Decryption",
    "ECDH",
    "KeyStorage",
    "SkaleDKG",
    "SkaleVerifier",
    "SkaleManager",
    "Pricing",
    "BountyV2",
    "Wallets"
]

async function main() {
    const [ owner,] = await ethers.getSigners();
    if (await ethers.provider.getCode("0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24") === "0x") {
        await run("erc1820");
    }

    let production = false;

    if (process.env.PRODUCTION === "true") {
        production = true;
    } else if (process.env.PRODUCTION === "false") {
        production = false;
    }

    if (!production) {
        contracts.push("TimeHelpersWithDebug");
    }

    const artifacts: {address: string, interface: Interface, contract: string}[] = [];

    const contractManagerName = "ContractManager";
    console.log("Deploy", contractManagerName);
    const contractManagerFactory = await ethers.getContractFactory(contractManagerName);
    const contractManager = (await upgrades.deployProxy(contractManagerFactory, [])) as ContractManager;
    await contractManager.deployTransaction.wait();
    console.log("Register", contractManagerName);
    await (await contractManager.setContractsAddress(contractManagerName, contractManager.address)).wait();
    artifacts.push({address: contractManager.address, interface: contractManager.interface, contract: contractManagerName})
    await verifyProxy(contractManagerName, contractManager.address);

    for (const contract of contracts) {
        let contractFactory: ContractFactory;
        try {
            contractFactory = await ethers.getContractFactory(contract);
        } catch (e) {
            const errorMessage = "The contract " + contract + " is missing links for the following libraries";
            const isLinkingLibraryError = e.toString().indexOf(errorMessage) + 1;
            if (isLinkingLibraryError) {
                contractFactory = await getContractFactoryWithLibraries(e, contract);
            } else {
                throw(e);
            }
        }
        console.log("Deploy", contract);
        const proxy = await upgrades.deployProxy(contractFactory, getInitializerParameters(contract, contractManager.address), { unsafeAllowLinkedLibraries: true });
        await proxy.deployTransaction.wait();
        const contractName = getNameInContractManager(contract);
        console.log("Register", contract, "as", contractName, "=>", proxy.address);
        const transaction = await contractManager.setContractsAddress(getNameInContractManager(contract), proxy.address);
        await transaction.wait();
        artifacts.push({address: proxy.address, interface: proxy.interface, contract});
        await verifyProxy(contract, proxy.address);
    }

    const skaleTokenName = "SkaleToken";
    console.log("Deploy", skaleTokenName);
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManager.address, []);
    await skaleToken.deployTransaction.wait();
    console.log("Register", skaleTokenName);
    await (await contractManager.setContractsAddress(skaleTokenName, skaleToken.address)).wait();
    artifacts.push({address: skaleToken.address, interface: skaleToken.interface, contract: skaleTokenName});
    await verify(skaleTokenName, skaleToken.address);

    if (!production) {
        console.log("Do actions for non production deployment");
        const money = "5000000000000000000000000000"; // 5e9 * 1e18
        await skaleToken.mint(owner.address, money, "0x", "0x");
    }

    console.log("Store ABIs");

    const outputObject: {[k: string]: any} = {};
    for (const artifact of artifacts) {
        const contractKey = getContractKeyInAbiFile(artifact.contract);
        outputObject[contractKey + "_address"] = artifact.address;
        outputObject[contractKey + "_abi"] = getAbi(artifact.interface);
    }
    const version = (await fs.readFile("VERSION", "utf-8")).trim();
    await fs.writeFile(`data/skale-manager-${version}-${network.name}-abi.json`, JSON.stringify(outputObject, null, 4));

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
