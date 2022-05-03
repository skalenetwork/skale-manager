import { ContractManager, NodesMock } from "../../../../typechain-types";
import { deployWithConstructorFunctionFactory } from "../factory";

export const deployNodesMock 
    = deployWithConstructorFunctionFactory("NodesMock") as (contractManager: ContractManager) => Promise<NodesMock>;