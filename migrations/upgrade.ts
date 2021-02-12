import { contracts, getContractKeyInAbiFile, getContractFactory } from "./deploy";
import { ethers, network, upgrades, run } from "hardhat";
import { promises as fs } from "fs";
import { Nodes } from "../typechain";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

async function main() {
    if ((await fs.readFile("DEPLOYED", "utf-8")).trim() !== "1.7.2-stable.0") {
        console.log("Upgrade script is not relevant");
        process.exit(1);
    }

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

    const contractsToUpgrade: string[] = [];
    for (const contract of ["ContractManager"].concat(contracts)) {
        const contractFactory = await getContractFactory(contract);
        let _contract = contract;
        if (contract === "BountyV2") {
            _contract = "Bounty";
        }
        const proxyAddress = abi[getContractKeyInAbiFile(_contract) + "_address"];

        const newImplementationAddress = await upgrades.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        const currentImplementationAddress = await getImplementationAddress(network.provider, proxyAddress);
        if (newImplementationAddress !== currentImplementationAddress)
        {
            contractsToUpgrade.push(contract);
            if (![1337, 31337].includes((await ethers.provider.getNetwork()).chainId)) {
                try {
                    await run("verify:verify", {
                        address: newImplementationAddress,
                        constructorArguments: []
                    });
                } catch (e) {
                    console.log(`Contract ${contract} was not verified on etherscan`);
                }
            }
        } else {
            console.log(`Contract ${contract} is up to date`);
        }
    }

    if (multisig) {
        console.log("Instructions for multisig:");
    }
    for (const contract of contractsToUpgrade) {
        const contractFactory = await getContractFactory(contract);
        let _contract = contract;
        if (contract === "BountyV2") {
            _contract = "Bounty";
        }
        const proxyAddress = abi[getContractKeyInAbiFile(_contract) + "_address"];

        if (multisig) {
            const newImplementationAddress =
                await upgrades.prepareUpgrade(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
            console.log(`Upgrade ${contract} at ${proxyAddress} to ${newImplementationAddress}`);
        } else {
            // TODO: initialize upgraded instance in the upgrade transaction
            await upgrades.upgradeProxy(proxyAddress, contractFactory, { unsafeAllowLinkedLibraries: true });
        }
    }

    // Initialize SegmentTree in Nodes

    const nodesName = "Nodes";

    const nodesContractFactory = await getContractFactory(nodesName);
    const nodesAddress = abi[getContractKeyInAbiFile(nodesName) + "_address"];
    if (nodesAddress) {
        const nodes = (nodesContractFactory.attach(nodesAddress)) as Nodes;
        if (multisig) {
            console.log(`Call ${nodesName}.initializeSegmentTree() at ${nodesAddress}`);
        } else {
            const receipt = await(await nodes.initializeSegmentTree()).wait();
            console.log("SegmentTree was initialized with", receipt.gasUsed.toNumber(), "gas used");
        }
    } else {
        console.log("Nodes address was not found!");
        console.log("Check your abi!");
        process.exit(1);
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