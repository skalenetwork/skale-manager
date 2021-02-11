import { promises as fs } from 'fs';
import { Interface, splitSignature } from "ethers/lib/utils";
import { ethers, upgrades, network } from "hardhat";
import { ContractManager } from "../typechain";
import { ContractFactory } from 'ethers';
import { deployLibraries, getLinkedContractFactory } from "../test/tools/deploy/factory";

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

export const contracts = [
    // "ContractManager", // it will be deployed explicitly

    "DelegationController",
    "DelegationPeriodManager",
    "Distributor",
    "Punisher",
    "SlashingTable",
    "TimeHelpers",
    "TokenLaunchLocker",
    "TokenLaunchManager",
    "TokenState",
    "ValidatorService",

    "ConstantsHolder",
    "Nodes",
    "NodeRotation",
    "Monitors",
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
        console.log("Deploy ERC1820 contract");
        await owner.sendTransaction({to: "0xa990077c3205cbDf861e17Fa532eeB069cE9fF96", value: ethers.utils.parseEther("0.08")})
        await ethers.provider.sendTransaction("0xf90a388085174876e800830c35008080b909e5608060405234801561001057600080fd5b506109c5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100a5576000357c010000000000000000000000000000000000000000000000000000000090048063a41e7d5111610078578063a41e7d51146101d4578063aabbb8ca1461020a578063b705676514610236578063f712f3e814610280576100a5565b806329965a1d146100aa5780633d584063146100e25780635df8122f1461012457806365ba36c114610152575b600080fd5b6100e0600480360360608110156100c057600080fd5b50600160a060020a038135811691602081013591604090910135166102b6565b005b610108600480360360208110156100f857600080fd5b5035600160a060020a0316610570565b60408051600160a060020a039092168252519081900360200190f35b6100e06004803603604081101561013a57600080fd5b50600160a060020a03813581169160200135166105bc565b6101c26004803603602081101561016857600080fd5b81019060208101813564010000000081111561018357600080fd5b82018360208201111561019557600080fd5b803590602001918460018302840111640100000000831117156101b757600080fd5b5090925090506106b3565b60408051918252519081900360200190f35b6100e0600480360360408110156101ea57600080fd5b508035600160a060020a03169060200135600160e060020a0319166106ee565b6101086004803603604081101561022057600080fd5b50600160a060020a038135169060200135610778565b61026c6004803603604081101561024c57600080fd5b508035600160a060020a03169060200135600160e060020a0319166107ef565b604080519115158252519081900360200190f35b61026c6004803603604081101561029657600080fd5b508035600160a060020a03169060200135600160e060020a0319166108aa565b6000600160a060020a038416156102cd57836102cf565b335b9050336102db82610570565b600160a060020a031614610339576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b6103428361092a565b15610397576040805160e560020a62461bcd02815260206004820152601a60248201527f4d757374206e6f7420626520616e204552433136352068617368000000000000604482015290519081900360640190fd5b600160a060020a038216158015906103b85750600160a060020a0382163314155b156104ff5760405160200180807f455243313832305f4143434550545f4d4147494300000000000000000000000081525060140190506040516020818303038152906040528051906020012082600160a060020a031663249cb3fa85846040518363ffffffff167c01000000000000000000000000000000000000000000000000000000000281526004018083815260200182600160a060020a0316600160a060020a031681526020019250505060206040518083038186803b15801561047e57600080fd5b505afa158015610492573d6000803e3d6000fd5b505050506040513d60208110156104a857600080fd5b5051146104ff576040805160e560020a62461bcd02815260206004820181905260248201527f446f6573206e6f7420696d706c656d656e742074686520696e74657266616365604482015290519081900360640190fd5b600160a060020a03818116600081815260208181526040808320888452909152808220805473ffffffffffffffffffffffffffffffffffffffff19169487169485179055518692917f93baa6efbd2244243bfee6ce4cfdd1d04fc4c0e9a786abd3a41313bd352db15391a450505050565b600160a060020a03818116600090815260016020526040812054909116151561059a5750806105b7565b50600160a060020a03808216600090815260016020526040902054165b919050565b336105c683610570565b600160a060020a031614610624576040805160e560020a62461bcd02815260206004820152600f60248201527f4e6f7420746865206d616e616765720000000000000000000000000000000000604482015290519081900360640190fd5b81600160a060020a031681600160a060020a0316146106435780610646565b60005b600160a060020a03838116600081815260016020526040808220805473ffffffffffffffffffffffffffffffffffffffff19169585169590951790945592519184169290917f605c2dbf762e5f7d60a546d42e7205dcb1b011ebc62a61736a57c9089d3a43509190a35050565b600082826040516020018083838082843780830192505050925050506040516020818303038152906040528051906020012090505b92915050565b6106f882826107ef565b610703576000610705565b815b600160a060020a03928316600081815260208181526040808320600160e060020a031996909616808452958252808320805473ffffffffffffffffffffffffffffffffffffffff19169590971694909417909555908152600284528181209281529190925220805460ff19166001179055565b600080600160a060020a038416156107905783610792565b335b905061079d8361092a565b156107c357826107ad82826108aa565b6107b85760006107ba565b815b925050506106e8565b600160a060020a0390811660009081526020818152604080832086845290915290205416905092915050565b6000808061081d857f01ffc9a70000000000000000000000000000000000000000000000000000000061094c565b909250905081158061082d575080155b1561083d576000925050506106e8565b61084f85600160e060020a031961094c565b909250905081158061086057508015155b15610870576000925050506106e8565b61087a858561094c565b909250905060018214801561088f5750806001145b1561089f576001925050506106e8565b506000949350505050565b600160a060020a0382166000908152600260209081526040808320600160e060020a03198516845290915281205460ff1615156108f2576108eb83836107ef565b90506106e8565b50600160a060020a03808316600081815260208181526040808320600160e060020a0319871684529091529020549091161492915050565b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff161590565b6040517f01ffc9a7000000000000000000000000000000000000000000000000000000008082526004820183905260009182919060208160248189617530fa90519096909550935050505056fea165627a7a72305820377f4a2d4301ede9949f163f319021a6e9c687c292a5e2b2c4734c126b524e6c00291ba01820182018201820182018201820182018201820182018201820182018201820a01820182018201820182018201820182018201820182018201820182018201820");
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
    console.log("Register", contractManagerName);
    await contractManager.setContractsAddress(contractManagerName, contractManager.address);
    artifacts.push({address: contractManager.address, interface: contractManager.interface, contract: contractManagerName})

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
        const contractName = getNameInContractManager(contract);
        console.log("Register", contract, "as", contractName, "=>", proxy.address);
        await contractManager.setContractsAddress(getNameInContractManager(contract), proxy.address);
        artifacts.push({address: proxy.address, interface: proxy.interface, contract});
    }

    const skaleTokenName = "SkaleToken";
    console.log("Deploy", skaleTokenName);
    const skaleTokenFactory = await ethers.getContractFactory(skaleTokenName);
    const skaleToken = await skaleTokenFactory.deploy(contractManager.address, []);
    console.log("Register", skaleTokenName);
    await contractManager.setContractsAddress(skaleTokenName, skaleToken.address);
    artifacts.push({address: skaleToken.address, interface: skaleToken.interface, contract: skaleTokenName});

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
        outputObject[contractKey + "_abi"] = JSON.parse(artifact.interface.format("json") as string);
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
