import {ethers, upgrades} from "hardhat";
import {ContractManager} from "../../../typechain-types";
import {deployLibraries} from "@skalenetwork/upgrade-tools";
import {AddressLike, Contract} from "ethers";

async function defaultDeploy<ContractType = Contract>(contractName: string,
                             contractManager: ContractManager) {
    const contractFactory = await ethers.getContractFactory(contractName);
    return await upgrades.deployProxy(contractFactory, [contractManager]) as ContractType;
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
        const libraries = await deployLibraries(libraryNames);
        const contractFactory = await ethers.getContractFactory(contractName, {libraries: Object.fromEntries(libraries)});
        try {
            return contractFactory.attach(await contractManager.getContract(contractName)) as unknown as ContractType;
        } catch (e) {
            const instance = await upgrades.deployProxy(contractFactory, [contractManager], {unsafeAllowLinkedLibraries: true}) as unknown as ContractType;
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
        const libraries = await deployLibraries(libraryNames);
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

export {
    deployFunctionFactory,
    deployWithConstructorFunctionFactory,
    deployWithConstructor,
    defaultDeploy,
    deployWithLibraryFunctionFactory,
    deployWithLibraryWithConstructor
};
