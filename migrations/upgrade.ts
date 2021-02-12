import { contracts, getContractKeyInAbiFile } from "./deploy";
import { ethers, upgrades } from "hardhat";
import { promises as fs } from "fs";
import { ContractManager, Nodes } from "../typechain";
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

    const contractsToUpgrade = [
        "Nodes",
        "NodeRotation",
        "SchainsInternal",
        "Schains",
        "SkaleDKG"
    ];

    for (const contract of ["ContractManager"].concat(contractsToUpgrade)) {
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
        let _contract = contract;
        if (contract === "BountyV2") {
            _contract = "Bounty";
        }
        const proxyAddress = abi[getContractKeyInAbiFile(_contract) + "_address"];
        console.log(`Upgrade ${contract} at ${proxyAddress}`);
        if (multisig) {
            await upgrades.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        } else {
            // TODO: 
            await upgrades.upgradeProxy(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        }
    }

    // Initialize SegmentTree in Nodes

    const nodesName = "Nodes";
    const nodesContractFactory = await ethers.getContractFactory(nodesName);
    const nodesAddress = abi[getContractKeyInAbiFile(nodesName) + "_address"];
    if (nodesAddress) {
        const nodes = (nodesContractFactory.attach(nodesAddress)) as Nodes;
        if (multisig) {
            // TODO: Defender?
            // await nodes.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        } else {
            const receipt = await(await nodes.initializeSegmentTree()).wait();
            console.log("SegmentTree was initialized with", receipt.gasUsed, "gas used");
        }
    } else {
        console.log("Nodes address was not found!");
        console.log("Check your abi!");
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