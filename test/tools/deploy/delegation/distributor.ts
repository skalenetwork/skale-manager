import { ContractManagerInstance, DistributorContract } from "../../../../types/truffle-contracts";
import { deployConstantsHolder } from "../constantsHolder";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationController } from "./delegationController";
import { deployDelegationPeriodManager } from "./delegationPeriodManager";
import { deployTimeHelpers } from "./timeHelpers";
import { deployValidatorService } from "./validatorService";

const Distributor: DistributorContract = artifacts.require("./Distributor");
const name = "Distributor";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await Distributor.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployValidatorService(contractManager);
    await deployDelegationController(contractManager);
    await deployDelegationPeriodManager(contractManager);
    await deployConstantsHolder(contractManager);
    await deployTimeHelpers(contractManager);
    await deploySkaleToken(contractManager);
}

export async function deployDistributor(contractManager: ContractManagerInstance) {
    try {
        return Distributor.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
