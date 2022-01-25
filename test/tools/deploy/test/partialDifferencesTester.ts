import { ContractManager, PartialDifferencesTester } from "../../../../typechain-types";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

export const deployPartialDifferencesTester = deployWithConstructorFunctionFactory(
    "PartialDifferencesTester",
    async (_: ContractManager) => {
        return undefined;
    },
    async (_: ContractManager) => {
        return await deployWithConstructor("PartialDifferencesTester");
    }
) as (contractManager: ContractManager) => Promise<PartialDifferencesTester>;
