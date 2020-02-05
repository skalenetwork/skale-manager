import { ContractManagerInstance } from "../../../types/truffle-contracts";

function getContract(contractName: string): Truffle.Contract<Truffle.ContractInstance> {
    return artifacts.require("./" + contractName);
}

async function defaultDeploy(contractName: string,
                             contractManager: ContractManagerInstance): Promise<Truffle.ContractInstance> {
    const Contract = getContract(contractName);
    const instance = await Contract.new(contractManager.address);
    await instance.initialize(contractManager.address);
    return instance;
}

function deployFunctionFactory(contractName: string,
                               deployDependencies: (contractManager: ContractManagerInstance) => Promise<void>
      = async (contractManager: ContractManagerInstance) => undefined,
                               deploy: (contractManager: ContractManagerInstance) => Promise<Truffle.ContractInstance>
      = async ( contractManager: ContractManagerInstance) => {
          return await defaultDeploy(contractName, contractManager);
      }): any {

    return async (contractManager: ContractManagerInstance) => {
            const Contract = getContract(contractName);
            try {
                return Contract.at(await contractManager.getContract(contractName));
            } catch (e) {
                const instance = await deploy(contractManager);
                await contractManager.setContractsAddress(contractName, instance.address);
                await deployDependencies(contractManager);
                return instance;
            }
        };
}

export { deployFunctionFactory };
