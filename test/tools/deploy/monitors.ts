import { ContractManager, Monitors } from "../../../typechain";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySkaleDKG } from "./skaleDKG";
import { deploySkaleVerifier } from "./skaleVerifier";

const deployMonitors: (contractManager: ContractManager) => Promise<Monitors>
    = deployFunctionFactory("Monitors",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deploySkaleVerifier(contractManager);
                                await deploySkaleDKG(contractManager);
                            });

export { deployMonitors };
