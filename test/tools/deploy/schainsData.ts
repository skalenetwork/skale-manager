import { ContractManagerInstance, SchainsInternalContract, SchainsInternalInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySkaleDKG } from "./skaleDKG";

const deploySchainsInternal: (contractManager: ContractManagerInstance) => Promise<SchainsInternalInstance>
    = deployFunctionFactory("SchainsInternal",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySchainsInternal };
