import { ContractManager, SyncManager } from "../../../typechain-types";
import { deployFunctionFactory } from "./factory";

const name = "SyncManager";

export const deploySyncManager = deployFunctionFactory(
    name
) as (contractManager: ContractManager) => Promise<SyncManager>;
