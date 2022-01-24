import { ContractManager, NodesMock } from "../../../../typechain-types";
import { deployWithConstructorFunctionFactory } from "../factory";

export const deployNodesMock: (contractManager: ContractManager) => Promise<NodesMock>
    = deployWithConstructorFunctionFactory("NodesMock");