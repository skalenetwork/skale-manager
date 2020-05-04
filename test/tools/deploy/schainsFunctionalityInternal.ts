import { ContractManagerInstance, SchainsFunctionalityInternalInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsData } from "./schainsData";

const deploySchainsFunctionalityInternal:
    (contractManager: ContractManagerInstance) => Promise<SchainsFunctionalityInternalInstance>
    = deployFunctionFactory("SchainsFunctionalityInternal",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deploySchainsData(contractManager);
                                await deployNodes(contractManager);
                            });

export { deploySchainsFunctionalityInternal };
