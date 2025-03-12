import {ethers, upgrades} from "hardhat";
import {ContractManager} from "../../../typechain-types";
import {AddressLike, Contract} from "ethers";
import {NonceProvider} from "@skalenetwork/upgrade-tools/dist/src/nonceProvider";

async function defaultDeploy<ContractType = Contract>(contractName: string,
                             contractManager: ContractManager) {
    const contractFactory = await ethers.getContractFactory(contractName);
    return await upgrades.deployProxy(
        contractFactory,
        [await ethers.resolveAddress(contractManager)]
    ) as ContractType;
}

async function defaultDeployWithConstructor<ContractType extends AddressLike = Contract>(
    contractName: string,
    contractManager: ContractManager) {
        const contractFactory = await ethers.getContractFactory(contractName);
        return await contractFactory.deploy(contractManager) as unknown as ContractType;
}

async function deployWithConstructor<ContractType = Contract>(
    contractName: string) {
        const contractFactory = await ethers.getContractFactory(contractName);
        return await contractFactory.deploy() as unknown as ContractType;
}

function deployFunctionFactory<ContractType extends AddressLike = Contract>(
    contractName: string,
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined),
    deploy
        = async ( contractManager: ContractManager) => {
          return await defaultDeploy<ContractType>(contractName, contractManager);
        }
) {
    return async (contractManager: ContractManager) => {
            const contractFactory = await ethers.getContractFactory(contractName);
            try {
                return contractFactory.attach(await contractManager.getContract(contractName)) as unknown as ContractType;
            } catch (e) {
                const instance = await deploy(contractManager);
                await contractManager.setContractsAddress(contractName, instance);
                await deployDependencies(contractManager);
                return instance;
            }
        };
}

function deployWithConstructorFunctionFactory<ContractType extends AddressLike = Contract>(
    contractName: string,
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined),
    deploy
        = async ( contractManager: ContractManager) => {
            return await defaultDeployWithConstructor<ContractType>(contractName, contractManager);
        }
) {
    return deployFunctionFactory(
        contractName,
        deployDependencies,
        deploy);
}


function deployWithLibraryFunctionFactory<ContractType extends AddressLike = Contract>(
    contractName: string,
    libraryNames: string[],
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined)
) {
    return async (contractManager: ContractManager) => {
        const libraries = await deployLibrariesSequentially(libraryNames);
        const contractFactory = await ethers.getContractFactory(contractName, {libraries: Object.fromEntries(libraries)});
        try {
            return contractFactory.attach(await contractManager.getContract(contractName)) as unknown as ContractType;
        } catch (e) {
            const instance = await upgrades.deployProxy(
                contractFactory,
                [await ethers.resolveAddress(contractManager)],
                {unsafeAllowLinkedLibraries: true}
            ) as unknown as ContractType;
            await contractManager.setContractsAddress(contractName, instance);
            await deployDependencies(contractManager);
            return instance;
        }
    }
}

function deployWithLibraryWithConstructor<ContractType extends AddressLike = Contract>(
    contractName: string,
    libraryNames: string[],
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined)
) {
    return async (contractManager: ContractManager) => {
        const libraries = await deployLibrariesSequentially(libraryNames);
        const contractFactory = await ethers.getContractFactory(contractName, {libraries: Object.fromEntries(libraries)});
        try {
            return contractFactory.attach(await contractManager.getContract(contractName)) as unknown as ContractType;
        } catch (e) {
            const instance = await upgrades.deployProxy(contractFactory, {unsafeAllowLinkedLibraries: true}) as unknown as ContractType;
            await contractManager.setContractsAddress(contractName, instance);
            await deployDependencies(contractManager);
            return instance;
        }
    }
}

const deployLibrary = async (
    libraryName: string,
    nonceProvider: NonceProvider
) => {
    const Library = await ethers.getContractFactory(libraryName);
    const library = await Library.
        deploy({"nonce": nonceProvider.reserveNonce()});
    await library.waitForDeployment()
    return await library.getAddress();
};

async function deployLibrariesSequentially(libraryNames: string[]){
    const [deployer] = await ethers.getSigners();
    const initializedNonceProvider = await NonceProvider.createForWallet(deployer);
    const libraries = new Map<string, string>();

    for (const lib of libraryNames){
        // Parallelization can't occur in testing environment (no mempool for transactions)
        // eslint-disable-next-line no-await-in-loop
        libraries.set(lib, await deployLibrary(lib, initializedNonceProvider));
    }
    return libraries;
}

export {
    deployFunctionFactory,
    deployWithConstructorFunctionFactory,
    deployWithConstructor,
    defaultDeploy,
    deployWithLibraryFunctionFactory,
    deployWithLibraryWithConstructor
};
