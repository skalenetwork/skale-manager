import { ContractManagerInstance,
         SkaleVerifierInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySchainsInternal } from "./schainsInternal";

const deploySkaleVerifier: (contractManager: ContractManagerInstance) => Promise<SkaleVerifierInstance>
    = deployFunctionFactory("SkaleVerifier",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                            });

export { deploySkaleVerifier };
