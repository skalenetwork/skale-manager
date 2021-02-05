import { ContractManager, SchainsInternal } from "../../../typechain";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySkaleDKG } from "./skaleDKG";

const deploySchainsInternal:
    (contractManager: ContractManager) => Promise<SchainsInternal>
    = deployFunctionFactory("SchainsInternal",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deploySkaleDKG(contractManager);
                                await deployNodes(contractManager);
                            });

export { deploySchainsInternal };
