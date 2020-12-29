import { ContractManagerInstance, SchainsInternalMockInstance } from "../../../../types/truffle-contracts";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployNodes } from "../nodes";
import { deploySkaleDKG } from "../skaleDKG";

const deploySchainsInternalMock:
    (contractManager: ContractManagerInstance) => Promise<SchainsInternalMockInstance>
    = deployFunctionFactory("SchainsInternalMock",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deploySkaleDKG(contractManager);
                                await deployNodes(contractManager);
                            });

export { deploySchainsInternalMock };
