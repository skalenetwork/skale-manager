import { ContractManager, Distributor } from "../../../../typechain-types";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationController } from "./delegationController";
import { deployDelegationPeriodManager } from "./delegationPeriodManager";
import { deployTimeHelpers } from "./timeHelpers";
import { deployValidatorService } from "./validatorService";

const name = "Distributor";

async function deployDependencies(contractManager: ContractManager) {
    await deployValidatorService(contractManager);
    await deployDelegationController(contractManager);
    await deployDelegationPeriodManager(contractManager);
    await deployConstantsHolder(contractManager);
    await deployTimeHelpers(contractManager);
    await deploySkaleToken(contractManager);
}

export const deployDistributor = deployFunctionFactory(
    name,
    deployDependencies
) as (contractManager: ContractManager) => Promise<Distributor>;
