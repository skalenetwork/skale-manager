import {SyncManager} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";

const name = "SyncManager";

export const deploySyncManager = deployFunctionFactory<SyncManager>(name);
