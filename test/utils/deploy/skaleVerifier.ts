import { ContractManagerInstance,
         SkaleVerifierContract,
         SkaleVerifierInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySchainsData } from "./schainsData";

const deploySkaleVerifier: (contractManager: ContractManagerInstance) => Promise<SkaleVerifierInstance>
    = deployFunctionFactory("SkaleVerifier",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsData(contractManager);
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const SkaleVerifier: SkaleVerifierContract = artifacts.require("./SkaleVerifier");
                                return await SkaleVerifier.new(contractManager.address);
                            });

export { deploySkaleVerifier };
