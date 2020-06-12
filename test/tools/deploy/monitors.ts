import { ContractManagerInstance, MonitorsInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySkaleDKG } from "./skaleDKG";
import { deploySkaleVerifier } from "./skaleVerifier";

const deployMonitors: (contractManager: ContractManagerInstance) => Promise<MonitorsInstance>
    = deployFunctionFactory("Monitors",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deploySkaleVerifier(contractManager);
                                await deploySkaleDKG(contractManager);
                            });

export { deployMonitors };
