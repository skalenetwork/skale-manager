import { ContractManagerInstance, MonitorsDataContract, MonitorsDataInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySkaleDKG } from "./skaleDKG";

const MonitorsData: MonitorsDataContract = artifacts.require("./MonitorsData");

const deployMonitorsData: (contractManager: ContractManagerInstance) => Promise<MonitorsDataInstance>
    = deployFunctionFactory("MonitorsData",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deployMonitorsData };
