import { ContractManagerContract } from "../../../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");

export async function deployContractManager() {
    const instance = await ContractManager.new();
    await instance.initialize();
    return instance;
}
