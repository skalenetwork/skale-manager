import { ContractManagerInstance, SchainsFunctionalityInternalInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsData } from "./schainsData";

const deploySchainsFunctionalityInternal:
    (contractManager: ContractManagerInstance) => Promise<SchainsFunctionalityInternalInstance>
    = deployFunctionFactory("SchainsFunctionalityInternal",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deploySchainsData(contractManager);
                                await deployNodesData(contractManager);
                            });

export { deploySchainsFunctionalityInternal };
