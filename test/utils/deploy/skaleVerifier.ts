import { ContractManagerInstance,
         SkaleVerifierInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySchainsData } from "./schainsData";

const deploySkaleVerifier: (contractManager: ContractManagerInstance) => Promise<SkaleVerifierInstance>
    = deployFunctionFactory("SkaleVerifier",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsData(contractManager);
                            });

export { deploySkaleVerifier };
