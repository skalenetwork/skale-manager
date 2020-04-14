import { ContractManagerInstance, TimeHelpersWithDebugInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";

const deployTimeHelpersWithDebug: (contractManager: ContractManagerInstance) => Promise<TimeHelpersWithDebugInstance>
    = deployFunctionFactory("TimeHelpersWithDebug",
                            undefined,
                            async (contractManager: ContractManagerInstance) => {
                                const TimeHelpersWithDebug = artifacts.require("./TimeHelpersWithDebug");
                                const instance = await TimeHelpersWithDebug.new();
                                await instance.initialize();
                                return instance;
                            });

export { deployTimeHelpersWithDebug };
