import { ContractManagerInstance, SkaleBalancesContract } from "../../../../types/truffle-contracts";
import { deploySkaleToken } from "../skaleToken";

const SkaleBalances: SkaleBalancesContract = artifacts.require("./SkaleBalances");
const name = "SkaleBalances";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await SkaleBalances.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deploySkaleToken(contractManager);
}

export async function deploySkaleBalances(contractManager: ContractManagerInstance) {
    try {
        return SkaleBalances.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
