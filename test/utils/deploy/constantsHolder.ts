import { ConstantsHolderContract, ContractManagerInstance } from "../../../types/truffle-contracts";

const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const name = "ConstantsHolder";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await ConstantsHolder.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

export async function deployConstantsHolder(contractManager: ContractManagerInstance) {
    try {
        return ConstantsHolder.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
