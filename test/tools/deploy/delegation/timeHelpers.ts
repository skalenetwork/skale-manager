import { ContractManager,
    TimeHelpers } from "../../../../typechain-types";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

const name = "TimeHelpers";

export const deployTimeHelpers = deployWithConstructorFunctionFactory(
    name,
    () => Promise.resolve(undefined),
    async () => {
        return await deployWithConstructor(name);
    }
) as (contractManager: ContractManager) => Promise<TimeHelpers>;
