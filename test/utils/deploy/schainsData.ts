import { ContractManagerInstance, SchainsDataContract, SchainsDataInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deploySkaleDKG } from "./skaleDKG";

const deploySchainsData: (contractManager: ContractManagerInstance) => Promise<SchainsDataInstance>
    = deployFunctionFactory("SchainsData",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySchainsData };
