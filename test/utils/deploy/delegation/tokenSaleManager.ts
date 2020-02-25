import { ContractManagerInstance, TokenSaleManagerContract } from "../../../../types/truffle-contracts";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationService } from "./delegationService";

const TokenSaleManager: TokenSaleManagerContract = artifacts.require("./TokenSaleManager");
const name = "TokenSaleManager";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await TokenSaleManager.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deploySkaleToken(contractManager);
    await deployDelegationService(contractManager);
}

export async function deployTokenSaleManager(contractManager: ContractManagerInstance) {
    try {
        return TokenSaleManager.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
