import { ContractManager,
    TimeHelpers } from "../../../../typechain-types";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

const name = "TimeHelpers";

export const deployTimeHelpers = deployWithConstructorFunctionFactory(
    name,
    async (_: ContractManager) => {
        return undefined;
    },
    async (_: ContractManager) => {
        return await deployWithConstructor(name);
    }
) as (contractManager: ContractManager) => Promise<TimeHelpers>;
