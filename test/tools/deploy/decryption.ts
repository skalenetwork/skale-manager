import { ContractManager, Decryption } from "../../../typechain-types";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

export const deployDecryption = deployFunctionFactory(
    "Decryption",
    () => Promise.resolve(undefined),
    async () => {
        return await deployWithConstructor("Decryption");
    }
) as (contractManager: ContractManager) => Promise<Decryption>;
