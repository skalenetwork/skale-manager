import {ContractManager, DKR} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";
import {deployNodeRotation} from "./nodeRotation";

export const deployDkr = deployFunctionFactory<DKR>(
    "DKR",
    async (contractManager: ContractManager) => {
        await deployNodeRotation(contractManager);
    }
);
