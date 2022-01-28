import { ContractManager, ReentrancyTester } from "../../../../typechain-types";
import { deployWithConstructorFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";

export const deployReentrancyTester = deployWithConstructorFunctionFactory(
    "ReentrancyTester",
    async (contractManager: ContractManager) => {
        await deploySkaleToken(contractManager);
    }
) as (contractManager: ContractManager) => Promise<ReentrancyTester>;
