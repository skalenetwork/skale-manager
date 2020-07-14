import { ContractManagerInstance, SchainsInternalInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySkaleDKG } from "./skaleDKG";

const deploySchainsInternal:
    (contractManager: ContractManagerInstance) => Promise<SchainsInternalInstance>
    = deployFunctionFactory("SchainsInternal",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deploySkaleDKG(contractManager);
                                await deployNodes(contractManager);
                            });

export { deploySchainsInternal };
