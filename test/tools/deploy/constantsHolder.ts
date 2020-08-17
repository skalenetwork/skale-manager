import { ConstantsHolderContract, ContractManagerInstance } from "../../../types/truffle-contracts";

const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const name = "ConstantsHolder";
import { rewardPeriod, deltaPeriod, checkTime } from "../constants";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await ConstantsHolder.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    await instance.setPeriods(rewardPeriod, deltaPeriod);
    await instance.setCheckTime(checkTime);
    return instance;
}

export async function deployConstantsHolder(
    contractManager: ContractManagerInstance,
) {
    try {
        return ConstantsHolder.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
