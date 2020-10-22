import { ContractManagerInstance, NodesMockInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";

export const deployNodesMock: (contractManager: ContractManagerInstance) => Promise<NodesMockInstance>
    = deployFunctionFactory("NodesMock",
                            async (contractManager: ContractManagerInstance) => {
                                return undefined;
                            });