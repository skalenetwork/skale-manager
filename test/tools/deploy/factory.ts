import { ethers, upgrades } from "hardhat";
import { ContractManager } from "../../../typechain-types";
import { deployLibraries } from "@skalenetwork/upgrade-tools";

async function defaultDeploy(contractName: string,
                             contractManager: ContractManager) {
    const contractFactory = await ethers.getContractFactory(contractName);
    return await upgrades.deployProxy(contractFactory, [contractManager.address]);
}

async function defaultDeployWithConstructor(
    contractName: string,
    contractManager: ContractManager) {
        const contractFactory = await ethers.getContractFactory(contractName);
        return await contractFactory.deploy(contractManager.address);
}

async function deployWithConstructor(
    contractName: string) {
        const contractFactory = await ethers.getContractFactory(contractName);
        return await contractFactory.deploy();
}

function deployFunctionFactory(
    contractName: string,
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined),
    deploy
        = async ( contractManager: ContractManager) => {
          return await defaultDeploy(contractName, contractManager);
        }
) {

    return async (contractManager: ContractManager) => {
            const contractFactory = await ethers.getContractFactory(contractName);
            try {
                return contractFactory.attach(await contractManager.getContract(contractName));
            } catch (e) {
                const instance = await deploy(contractManager);
                await contractManager.setContractsAddress(contractName, instance.address);
                await deployDependencies(contractManager);
                return instance;
            }
        };
}

function deployWithConstructorFunctionFactory(
    contractName: string,
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined),
    deploy
        = async ( contractManager: ContractManager) => {
            return await defaultDeployWithConstructor(contractName, contractManager);
        }
) {
    return deployFunctionFactory(
        contractName,
        deployDependencies,
        deploy);
}


function deployWithLibraryFunctionFactory(
    contractName: string,
    libraryNames: string[],
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined)
) {
    return async (contractManager: ContractManager) => {
        const libraries = await deployLibraries(libraryNames);
        const contractFactory = await ethers.getContractFactory(contractName, {libraries: Object.fromEntries(libraries)});
        try {
            return contractFactory.attach(await contractManager.getContract(contractName));
        } catch (e) {
            const instance = await upgrades.deployProxy(contractFactory, [contractManager.address], { unsafeAllowLinkedLibraries: true });
            await contractManager.setContractsAddress(contractName, instance.address);
            await deployDependencies(contractManager);
            return instance;
        }
    }
}

function deployWithLibraryWithConstructor(
    contractName: string,
    libraryNames: string[],
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = () => Promise.resolve(undefined)
) {
    return async (contractManager: ContractManager) => {
        const libraries = await deployLibraries(libraryNames);
        const contractFactory = await ethers.getContractFactory(contractName, {libraries: Object.fromEntries(libraries)});
        try {
            return contractFactory.attach(await contractManager.getContract(contractName));
        } catch (e) {
            const instance = await upgrades.deployProxy(contractFactory, { unsafeAllowLinkedLibraries: true });
            await contractManager.setContractsAddress(contractName, instance.address);
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
