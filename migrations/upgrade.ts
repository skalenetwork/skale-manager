import { contracts, getContractKeyInAbiFile } from "./deploy";
import { ethers, upgrades } from "hardhat";
import { promises as fs } from "fs";

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
        const contractFactory = await ethers.getContractFactory(contract);
        const proxyAddress = abi[getContractKeyInAbiFile(contract) + "_address"];
        console.log(`Upgrade ${contract} at ${proxyAddress}`);
        if (multisig) {
            await upgrades.prepareUpgrade(proxyAddress, contractFactory);
        } else {
            await upgrades.upgradeProxy(proxyAddress, contractFactory);
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