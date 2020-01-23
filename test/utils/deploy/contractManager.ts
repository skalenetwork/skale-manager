import { ContractManagerContract } from "../../../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");

export async function deployContractManager() {
    return await ContractManager.new();
}
