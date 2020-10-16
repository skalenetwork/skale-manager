import { ContractManagerInstance, NodesMockInstance } from "../../../../types/truffle-contracts";
import { deployWithConstructorFunctionFactory } from "../factory";

export const deployNodesMock: (contractManager: ContractManagerInstance) => Promise<NodesMockInstance>
    = deployWithConstructorFunctionFactory("NodesMock",
                            async (contractManager: ContractManagerInstance) => {
                                return undefined;
                            });