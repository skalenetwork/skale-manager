import { ContractManagerInstance, ValidatorServiceContract } from "../../../../types/truffle-contracts";
import { deployConstantsHolder } from "../constantsHolder";
import { deployDelegationController } from "./delegationController";

const ValidatorService: ValidatorServiceContract = artifacts.require("./ValidatorService");
const name = "ValidatorService";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await ValidatorService.new();
    await instance.initialize(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployDelegationController(contractManager);
    await deployConstantsHolder(contractManager);
}

export async function deployValidatorService(contractManager: ContractManagerInstance) {
    try {
        return ValidatorService.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
