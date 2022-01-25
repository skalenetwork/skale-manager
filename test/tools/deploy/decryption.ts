import { ContractManager, Decryption } from "../../../typechain-types";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

export const deployDecryption = deployFunctionFactory(
    "Decryption",
    async (_: ContractManager) => {
        return undefined;
    },
    async (_: ContractManager) => {
        return await deployWithConstructor("Decryption");
    }
) as (contractManager: ContractManager) => Promise<Decryption>;
