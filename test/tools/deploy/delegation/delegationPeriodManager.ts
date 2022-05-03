import { ContractManager, DelegationPeriodManager } from "../../../../typechain-types";
import { deployFunctionFactory } from "../factory";

const name = "DelegationPeriodManager";

export const deployDelegationPeriodManager = deployFunctionFactory(name) as (contractManager: ContractManager) => Promise<DelegationPeriodManager>;
