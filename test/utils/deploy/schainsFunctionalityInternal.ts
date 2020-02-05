import { ContractManagerInstance, SchainsFunctionalityInternalContract, SchainsFunctionalityInternalInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsData } from "./schainsData";

const deploySchainsFunctionalityInternal:
    (contractManager: ContractManagerInstance) => Promise<SchainsFunctionalityInternalInstance>
    = deployFunctionFactory("SchainsFunctionalityInternal",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deploySchainsData(contractManager);
                                await deployNodesData(contractManager);
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const SchainsFunctionalityInternal: SchainsFunctionalityInternalContract
                                    = artifacts.require("./SchainsFunctionalityInternal");
                                return await SchainsFunctionalityInternal.new(
                                    "SchainsFunctionality",
                                    "SchainsData",
                                    contractManager.address);
                            });

export { deploySchainsFunctionalityInternal };
