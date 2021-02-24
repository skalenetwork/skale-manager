import { ContractManager, ValidatorService } from "../../../../typechain";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";

const name = "ValidatorService";

async function deployDependencies(contractManager: ContractManager) {
    await deployDelegationController(contractManager);
    await deployConstantsHolder(contractManager);
}

export const deployValidatorService: (contractManager: ContractManager) => ValidatorService = deployFunctionFactory(name, deployDependencies);
