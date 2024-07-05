import {deployConstantsHolder} from "./constantsHolder";
import {deployFunctionFactory} from "./factory";
import {deployNodes} from "./nodes";
import {deploySchainsInternal} from "./schainsInternal";
import {deploySkaleVerifier} from "./skaleVerifier";
import {deployNodeRotation} from "./nodeRotation";
import {ContractManager, Schains} from "../../../typechain-types";

export const deploySchains = deployFunctionFactory<Schains>(
    "Schains",
    async (contractManager: ContractManager) => {
        await deploySchainsInternal(contractManager);
        await deploySchainsInternal(contractManager);
        await deployConstantsHolder(contractManager);
        await deployNodes(contractManager);
        await deploySkaleVerifier(contractManager);
        await deployNodeRotation(contractManager);
    }
);
