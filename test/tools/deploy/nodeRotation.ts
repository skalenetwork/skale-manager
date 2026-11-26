import {deployFunctionFactory} from "./factory";
import {deployNodes} from "./nodes";
import {deploySchainsInternal} from "./schainsInternal";
import {deployConstantsHolder} from "./constantsHolder";
import {ContractManager, DKR, NodeRotation} from "../../../typechain-types";

const deployDKR = deployFunctionFactory<DKR>("DKR");

export const deployNodeRotation = deployFunctionFactory<NodeRotation>(
    "NodeRotation",
    async (contractManager: ContractManager) => {
        await deployNodes(contractManager);
        await deploySchainsInternal(contractManager);
        await deployConstantsHolder(contractManager);
        await deployDKR(contractManager);
    }
);
