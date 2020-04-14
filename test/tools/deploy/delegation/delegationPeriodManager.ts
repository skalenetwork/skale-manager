import { ContractManagerInstance,
    DelegationPeriodManagerContract } from "../../../../types/truffle-contracts";

const DelegationPeriodManager: DelegationPeriodManagerContract = artifacts.require("./DelegationPeriodManager");
const name = "DelegationPeriodManager";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await DelegationPeriodManager.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress("DelegationPeriodManager", instance.address);
    return instance;
}

export async function deployDelegationPeriodManager(contractManager: ContractManagerInstance) {
    try {
        return DelegationPeriodManager.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
