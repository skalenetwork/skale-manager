import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deployConstantsHolder } from "./constantsHolder";
import { ContractManager, NodeRotation } from "../../../typechain";

const deployNodeRotation: (contractManager: ContractManager) => Promise<NodeRotation>
    = deployFunctionFactory("NodeRotation",
                            async (contractManager: ContractManager) => {
                                await deployNodes(contractManager);
                                await deploySchainsInternal(contractManager);
                                await deployConstantsHolder(contractManager);
                            });

export { deployNodeRotation };
