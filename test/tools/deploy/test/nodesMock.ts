import { ContractManager, NodesMock } from "../../../../typechain";
import { deployWithConstructorFunctionFactory } from "../factory";

export const deployNodesMock: (contractManager: ContractManager) => Promise<NodesMock>
    = deployWithConstructorFunctionFactory("NodesMock");