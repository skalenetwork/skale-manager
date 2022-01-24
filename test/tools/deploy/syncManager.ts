import { ContractManager, SyncManager } from "../../../typechain-types";
import { deployFunctionFactory } from "./factory";

const name = "SyncManager";

export const deploySyncManager: (contractManager: ContractManager) => Promise<SyncManager> = deployFunctionFactory(name);
