import { ContractManager, DelegationPeriodManager } from "../../../../typechain";
import { deployFunctionFactory } from "../factory";

const name = "DelegationPeriodManager";

export const deployDelegationPeriodManager: (contractManager: ContractManager) => Promise<DelegationPeriodManager>
    = deployFunctionFactory(name);
