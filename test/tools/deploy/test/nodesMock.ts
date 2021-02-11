import { ContractManager, NodesMock } from "../../../../typechain";
import { deployFunctionFactory } from "../factory";

export const deployNodesMock: (contractManager: ContractManager) => Promise<NodesMock>
    = deployFunctionFactory("NodesMock",
                            async (contractManager: ContractManager) => {
                                return undefined;
                            });