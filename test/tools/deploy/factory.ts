import { ethers, upgrades } from "hardhat";
import hre from "hardhat";
import { ContractManager } from "../../../typechain";
import { Artifact } from "hardhat/types";
upgrades.silenceWarnings();

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


function deployWithLibraryFunctionFactory(
    contractName: string,
    libraryNames: string[],
    deployDependencies: (contractManager: ContractManager) => Promise<void>
        = async (contractManager: ContractManager) => undefined
    ): any {
        return async (contractManager: ContractManager) => {
            const libraries = await deployLibraries(libraryNames);
            const contractFactory = await getLinkedContractFactory(contractName, libraries);
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

async function getLinkedContractFactory(contractName: string, libraries: any) {
    const cArtifact = await hre.artifacts.readArtifact(contractName);
    const linkedBytecode = _linkBytecode(cArtifact, libraries);
    const ContractFactory = await ethers.getContractFactory(cArtifact.abi, linkedBytecode);
    return ContractFactory;
}

async function deployLibraries(libraryNames: string[]) {
    const libraries: any = {};
    for (const libraryName of libraryNames) {
        libraries[libraryName] = await _deployLibrary(libraryName);
    }
    return libraries;
}

async function _deployLibrary(libraryName: string) {
    const Library = await ethers.getContractFactory(libraryName);
    const library = await Library.deploy();
    await library.deployed();
    return library.address;
}

function _linkBytecode(artifact: Artifact, libraries: { [x: string]: any }) {
    let bytecode = artifact.bytecode;
    for (const [, fileReferences] of Object.entries(artifact.linkReferences)) {
        for (const [libName, fixups] of Object.entries(fileReferences)) {
            const addr = libraries[libName];
            if (addr === undefined) {
                continue;
            }
            for (const fixup of fixups) {
                bytecode =
                bytecode.substr(0, 2 + fixup.start * 2) +
                addr.substr(2) +
                bytecode.substr(2 + (fixup.start + fixup.length) * 2);
            }
        }
    }
    return bytecode;
}

export { deployFunctionFactory, deployWithConstructorFunctionFactory, deployWithConstructor,
         defaultDeploy, deployWithLibraryFunctionFactory, deployLibraries, getLinkedContractFactory};
