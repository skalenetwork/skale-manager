import { ContractManagerInstance, MonitorsDataInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySkaleDKG } from "./skaleDKG";

const deployMonitorsData: (contractManager: ContractManagerInstance) => Promise<MonitorsDataInstance>
    = deployFunctionFactory("MonitorsData",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deployMonitorsData };
