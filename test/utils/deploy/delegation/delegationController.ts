import { ContractManagerInstance,
    DelegationControllerContract } from "../../../../types/truffle-contracts";
import { deployDelegationPeriodManager } from "./delegationPeriodManager";
import { deployTokenState } from "./tokenState";

const DelegationController: DelegationControllerContract = artifacts.require("./DelegationController");
const name = "DelegationController";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await DelegationController.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployDelegationPeriodManager(contractManager);
    await deployTokenState(contractManager);
}

export async function deployDelegationController(contractManager: ContractManagerInstance) {
    try {
        return DelegationController.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
