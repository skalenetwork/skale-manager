import { ContractManager, DelegationPeriodManager } from "../../../../typechain-types";
import { deployFunctionFactory } from "../factory";

const name = "DelegationPeriodManager";

export const deployDelegationPeriodManager: (contractManager: ContractManager) => Promise<DelegationPeriodManager>
    = deployFunctionFactory(name);
