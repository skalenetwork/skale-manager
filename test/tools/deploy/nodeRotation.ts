import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deployConstantsHolder } from "./constantsHolder";
import { ContractManager, NodeRotation } from "../../../typechain-types";

export const deployNodeRotation = deployFunctionFactory(
    "NodeRotation",
    async (contractManager: ContractManager) => {
        await deployNodes(contractManager);
        await deploySchainsInternal(contractManager);
        await deployConstantsHolder(contractManager);
    }
) as (contractManager: ContractManager) => Promise<NodeRotation>;
