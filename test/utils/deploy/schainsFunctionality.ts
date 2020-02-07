import { ContractManagerInstance, SchainsFunctionalityInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsData } from "./schainsData";
import { deploySchainsFunctionalityInternal } from "./schainsFunctionalityInternal";
import { deploySkaleVerifier } from "./skaleVerifier";

const deploySchainsFunctionality: (contractManager: ContractManagerInstance) => Promise<SchainsFunctionalityInstance>
    = deployFunctionFactory("SchainsFunctionality",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsFunctionalityInternal(contractManager);
                                await deploySchainsData(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deployNodesData(contractManager);
                                await deploySkaleVerifier(contractManager);
                            });

export { deploySchainsFunctionality };
