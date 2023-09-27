import {lstatSync, promises as fs} from 'fs';

interface SizeStatistics {
    name: string;
    size: number;
}

interface Artifact {
    deployedBytecode: string
}

const CODE_SIZE_LIMIT = 24 * 1024 ;

async function getByteCodesSizes(directory: string) {
    let sizes: SizeStatistics[] = [];
    for (const entry of await fs.readdir(directory)) {
        const fullPath = directory + '/' + entry;
        if (lstatSync(fullPath).isDirectory()) {
            sizes = sizes.concat(await getByteCodesSizes(fullPath));
        } else {
            if (entry.endsWith(".json") && !entry.endsWith(".dbg.json")) {
                const artifact = JSON.parse(await fs.readFile(fullPath, "utf-8")) as Artifact;
                let deployedBytecode = artifact.deployedBytecode;
                if (deployedBytecode.startsWith("0x")) {
                    deployedBytecode = deployedBytecode.substr(2);
                }
                sizes.push({
                    name: entry.slice(0, -5),
                    size: deployedBytecode.length / 2
                });
            }
        }
    }
    return sizes;
}

function format(contract: SizeStatistics) {
    const tooBig = contract.size > CODE_SIZE_LIMIT;
    let _name = contract.name;
    if (contract.name.length < 8) {
        _name = contract.name + "\t\t\t";
    } else if (contract.name.length < 16) {
        _name = contract.name + "\t\t";
    } else if (contract.name.length < 24) {
        _name = contract.name + "\t";
    }
    return `${ contract.size }\t${ _name }\t(${ Math.abs(contract.size - CODE_SIZE_LIMIT)} `
        + (tooBig ? "more" : "less") + " than limit)";
}

async function main() {
    const contracts = (await getByteCodesSizes("../artifacts/contracts/"))
        .filter(contract => contract.size > 0)
        .sort((a, b) => b.size - a.size)

    const tooBigContracts = contracts
        .filter(contract => contract.size > CODE_SIZE_LIMIT)
    if (tooBigContracts.length > 0) {
        console.log("Some contracts cannot be deployed!");
        tooBigContracts.forEach(contract => console.log(format(contract)))
        console.log("");
        console.log("=".repeat(70));
        console.log("");
    }

    contracts
        .forEach(contract => console.log(format(contract)));
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}