import { ethers } from "hardhat";
import { ContractManager } from "../../../typechain";

async function defaultDeploy(contractName: string,
                             contractManager: ContractManager) {
    const contractFactory = await ethers.getContractFactory(contractName);
    const instance = await contractFactory.deploy();
    await instance.initialize(contractManager.address);
    return instance;
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
      = async (contractManager: ContractManager) => undefined,
    deploy = async ( contractManager: ContractManager) => {
          return await defaultDeploy(contractName, contractManager);
      }): any {

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
        = async (contractManager: ContractManager) => undefined,
    deploy
        = async ( contractManager: ContractManager) => {
            return await defaultDeployWithConstructor(contractName, contractManager);
        }
    ): any {
            return deployFunctionFactory(
                contractName,
                deployDependencies,
                deploy);
    }

export { deployFunctionFactory, deployWithConstructorFunctionFactory, deployWithConstructor };
