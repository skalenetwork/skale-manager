import { contracts, getContractKeyInAbiFile } from "./deploy";
import { ethers, upgrades } from "hardhat";
import { promises as fs } from "fs";
import { ContractFactory } from "ethers";
import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";

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

async function main() {
    if (!process.env.ABI) {
        console.log("Set path to file with ABI and addresses to ABI environment variables");
        return;
    }

    let multisig = false;
    if (process.env.MULTISIG) {
        console.log("Prepare upgrade for multisig");
        multisig = true;
    }

    const abiFilename = process.env.ABI;
    const abi = JSON.parse(await fs.readFile(abiFilename, "utf-8"));

    for (const contract of ["ContractManager"].concat(contracts)) {
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
        const proxyAddress = abi[getContractKeyInAbiFile(contract) + "_address"];
        console.log(`Upgrade ${contract} at ${proxyAddress}`);
        if (multisig) {
            await upgrades.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        } else {
            await upgrades.upgradeProxy(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        }
    }

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