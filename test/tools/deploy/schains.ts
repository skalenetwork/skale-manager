import { ContractManagerInstance, SchainsInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySkaleVerifier } from "./skaleVerifier";

const deploySchains: (contractManager: ContractManagerInstance) => Promise<SchainsInstance>
    = deployFunctionFactory("Schains",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deploySchainsInternal(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deploySkaleVerifier(contractManager);
                            });

export { deploySchains };
