import { ContractManagerInstance, ValidatorServiceContract } from "../../../../types/truffle-contracts";

const ValidatorService: ValidatorServiceContract = artifacts.require("./ValidatorService");
const name = "ValidatorService";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await ValidatorService.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

export async function deployValidatorService(contractManager: ContractManagerInstance) {
    try {
        return ValidatorService.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
