import {promises as fs} from 'fs';
import {contracts} from "../migrations/deploy";
import {ethers} from "hardhat";
import {getAbi, getVersion} from '@skalenetwork/upgrade-tools';
import {ContractFactory} from 'ethers';
import {Libraries} from '@nomiclabs/hardhat-ethers/types';

async function main() {
    const allContracts = contracts.concat(["SkaleToken", "TimeHelpersWithDebug"])
    const abi: {[name: string]: []} = {};
    const librariesRequirements: {[name: string]: string[]} = {
        "Nodes": [
            "SegmentTree"
        ],
        "SkaleDKG": [
            "SkaleDkgAlright",
            "SkaleDkgBroadcast",
            "SkaleDkgComplaint",
            "SkaleDkgPreResponse",
            "SkaleDkgResponse"
        ]
    }
    for (const contractName of allContracts) {
        console.log(`Load ABI of ${contractName}`);
        let factory: ContractFactory;
        if (Object.keys(librariesRequirements).includes(contractName)) {
            const libraries: Libraries = {};
            for(const library of librariesRequirements[contractName]) {
                libraries[library] = ethers.ZeroAddress;
            }
            factory = await ethers.getContractFactory(contractName, {libraries});
        } else {
            factory = await ethers.getContractFactory(contractName);
        }
        abi[contractName] = getAbi(factory.interface);
    }
    const version = await getVersion();
    const filename = `data/skale-manager-${version}-abi.json`;
    console.log(`Save to ${filename}`)
    await fs.writeFile(filename, JSON.stringify(abi, null, 4));
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
