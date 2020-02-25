import { ContractManagerInstance, SkaleTokenContract } from "../../../types/truffle-contracts";
import { deployDelegationService } from "./delegation/delegationService";

const SkaleToken: SkaleTokenContract = artifacts.require("./SkaleToken");
const name = "SkaleToken";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await SkaleToken.new(contractManager.address, []);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployDelegationService(contractManager);
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
