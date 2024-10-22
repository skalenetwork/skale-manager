import {ContractManager, Punisher} from "../../../../typechain-types";
import {deployFunctionFactory} from "../factory";
import {deployDelegationController} from "./delegationController";
import {deployValidatorService} from "./validatorService";

export const deployPunisher = deployFunctionFactory(
    "Punisher",
    async (contractManager: ContractManager) => {
        await deployDelegationController(contractManager);
        await deployValidatorService(contractManager);
    }
) as (contractManager: ContractManager) => Promise<Punisher>;
