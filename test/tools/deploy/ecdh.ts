import { ContractManager, ECDH } from "../../../typechain-types";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

export const deployECDH = deployFunctionFactory(
    "ECDH",
    () => Promise.resolve(undefined),
    async () => {
        return await deployWithConstructor("ECDH");
    }
) as (contractManager: ContractManager) => Promise<ECDH>;
