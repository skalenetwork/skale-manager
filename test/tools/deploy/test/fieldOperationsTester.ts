import { ContractManager, FieldOperationsTester } from "../../../../typechain-types";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

export const deployFieldOperationsTester = deployWithConstructorFunctionFactory(
    "FieldOperationsTester",
    () => Promise.resolve(undefined),
    () => deployWithConstructor("FieldOperationsTester")
) as (contractManager: ContractManager) => Promise<FieldOperationsTester>;
