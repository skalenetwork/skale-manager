import { ContractManagerInstance, TokenStateContract } from "../../../../types/truffle-contracts";
import { deployDelegationController } from "./delegationController";
import { deployPunisher } from "./punisher";
import { deployTimeHelpers } from "./timeHelpers";

const TokenState: TokenStateContract = artifacts.require("./TokenState");
const name = "TokenState";

async function deploy(contractManager: ContractManagerInstance) {
    const tokenState = await TokenState.new();
    await tokenState.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, tokenState.address);
    return tokenState;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
    await deployTimeHelpers(contractManager);
}

export async function deployTokenState(contractManager: ContractManagerInstance) {
    try {
        return TokenState.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
