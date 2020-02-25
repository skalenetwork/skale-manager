import { ContractManagerInstance, NodesFunctionalityInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";

const deployNodesFunctionality: (contractManager: ContractManagerInstance) => Promise<NodesFunctionalityInstance>
    = deployFunctionFactory("NodesFunctionality",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodesData(contractManager);
                                await deployValidatorService(contractManager);
                                await deployConstantsHolder(contractManager);
                            });

export { deployNodesFunctionality };
