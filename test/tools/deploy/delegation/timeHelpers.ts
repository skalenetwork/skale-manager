import { ContractManager,
    TimeHelpers } from "../../../../typechain";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

const name = "TimeHelpers";

export const deployTimeHelpers: (contractManager: ContractManager) => Promise<TimeHelpers> 
    = deployWithConstructorFunctionFactory(
        name,
        async (_: ContractManager) => {
            return undefined;
        },
        async (_: ContractManager) => {
            return await deployWithConstructor(name);
        });
