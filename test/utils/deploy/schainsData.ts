import { ContractManagerInstance, SchainsDataContract, SchainsDataInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";

const deploySchainsData: (contractManager: ContractManagerInstance) => Promise<SchainsDataInstance>
    = deployFunctionFactory("SchainsData",
                            async (contractManager: ContractManagerInstance) => {
                                return;
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
                                const instance
                                = await SchainsData.new("SchainsFunctionalityInternal", contractManager.address);
                                return instance;
                            });

export { deploySchainsData };
