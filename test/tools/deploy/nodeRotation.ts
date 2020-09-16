import { ContractManagerInstance, NodeRotationInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deployConstantsHolder } from "./constantsHolder";

const deployNodeRotation: (contractManager: ContractManagerInstance) => Promise<NodeRotationInstance>
    = deployFunctionFactory("NodeRotation",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodes(contractManager);
                                await deploySchainsInternal(contractManager);
                                await deployConstantsHolder(contractManager);
                            });

export { deployNodeRotation };
