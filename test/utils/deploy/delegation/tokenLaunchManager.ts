import { ContractManagerInstance, TokenLaunchManagerContract } from "../../../../types/truffle-contracts";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationService } from "./delegationService";

const TokenLaunchManager: TokenLaunchManagerContract = artifacts.require("./TokenLaunchManager");
const name = "TokenLaunchManager";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await TokenLaunchManager.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deploySkaleToken(contractManager);
    await deployDelegationService(contractManager);
}

export async function deployTokenLaunchManager(contractManager: ContractManagerInstance) {
    try {
        return TokenLaunchManager.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
