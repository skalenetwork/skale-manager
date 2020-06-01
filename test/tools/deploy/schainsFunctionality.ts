import { ContractManagerInstance, SchainsFunctionalityInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySkaleVerifier } from "./skaleVerifier";

const deploySchainsFunctionality: (contractManager: ContractManagerInstance) => Promise<SchainsFunctionalityInstance>
    = deployFunctionFactory("SchainsFunctionality",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deploySchainsInternal(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deploySkaleVerifier(contractManager);
                            });

export { deploySchainsFunctionality };
