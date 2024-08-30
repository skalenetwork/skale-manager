import {ContractManager, SkaleVerifier} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";
import {deploySchainsInternal} from "./schainsInternal";

export const deploySkaleVerifier = deployFunctionFactory<SkaleVerifier>(
    "SkaleVerifier",
    async (contractManager: ContractManager) => {
        await deploySchainsInternal(contractManager);
    }
);
