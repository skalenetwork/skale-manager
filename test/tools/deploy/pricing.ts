import {ContractManager, Pricing} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";
import {deployNodes} from "./nodes";
import {deploySchainsInternal} from "./schainsInternal";

export const deployPricing = deployFunctionFactory<Pricing>(
    "Pricing",
    async (contractManager: ContractManager) => {
        await deployNodes(contractManager);
        await deploySchainsInternal(contractManager);
    }
);
