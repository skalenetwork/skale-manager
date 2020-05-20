import { ContractManagerInstance, MonitorsFunctionalityContract, MonitorsFunctionalityInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployMonitorsData } from "./monitorsData";
import { deployNodes } from "./nodes";
import { deploySkaleVerifier } from "./skaleVerifier";

const deployMonitorsFunctionality: (contractManager: ContractManagerInstance) => Promise<MonitorsFunctionalityInstance>
    = deployFunctionFactory("MonitorsFunctionality",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployMonitorsData(contractManager);
                                await deployNodes(contractManager);
                                await deploySkaleVerifier(contractManager);
                            });

export { deployMonitorsFunctionality };
