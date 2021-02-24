import { ContractManager, SchainsInternalMock } from "../../../../typechain";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployNodes } from "../nodes";
import { deploySkaleDKG } from "../skaleDKG";

const deploySchainsInternalMock:
    (contractManager: ContractManager) => Promise<SchainsInternalMock>
    = deployFunctionFactory("SchainsInternalMock",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deploySkaleDKG(contractManager);
                                await deployNodes(contractManager);
                            });

export { deploySchainsInternalMock };
