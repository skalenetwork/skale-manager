import { ContractManager, ValidatorService } from "../../../../typechain-types";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";

const name = "ValidatorService";

async function deployDependencies(contractManager: ContractManager) {
    await deployDelegationController(contractManager);
    await deployConstantsHolder(contractManager);
}

export const deployValidatorService: (contractManager: ContractManager) => Promise<ValidatorService>
    = deployFunctionFactory(name, deployDependencies);
