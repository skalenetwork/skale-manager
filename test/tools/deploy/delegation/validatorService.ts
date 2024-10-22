import {ContractManager, ValidatorService} from "../../../../typechain-types";
import {deployConstantsHolder} from "../constantsHolder";
import {deployFunctionFactory} from "../factory";
import {deployPaymasterController} from "../paymasterController";
import {deployDelegationController} from "./delegationController";

const name = "ValidatorService";

async function deployDependencies(contractManager: ContractManager) {
    await deployDelegationController(contractManager);
    await deployConstantsHolder(contractManager);
    await deployPaymasterController(contractManager);
}

export const deployValidatorService = deployFunctionFactory(
    name,
    deployDependencies
) as (contractManager: ContractManager) => Promise<ValidatorService>;
