import { ContractManager, SkaleVerifier } from "../../../typechain";
import { deployFunctionFactory } from "./factory";
import { deploySchainsInternal } from "./schainsInternal";

const deploySkaleVerifier: (contractManager: ContractManager) => Promise<SkaleVerifier>
    = deployFunctionFactory("SkaleVerifier",
                            async (contractManager: ContractManager) => {
                                await deploySchainsInternal(contractManager);
                            });

export { deploySkaleVerifier };
