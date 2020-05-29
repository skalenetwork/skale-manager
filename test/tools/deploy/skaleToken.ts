import { ContractManagerInstance, SkaleTokenContract } from "../../../types/truffle-contracts";
import { deployDelegationController } from "./delegation/delegationController";
import { deployPunisher } from "./delegation/punisher";
import { deployTokenState } from "./delegation/tokenState";

const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const name = "SkaleToken";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await SkaleToken.new(contractManager.address, []);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
}

export async function deploySkaleToken(contractManager: ContractManagerInstance) {
    try {
        return SkaleToken.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
