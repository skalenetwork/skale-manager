import { ContractManager, SchainsInternalMock } from "../../../../typechain";
import { deployConstantsHolder } from "../constantsHolder";
import { defaultDeploy, deployFunctionFactory } from "../factory";
import { deployNodes } from "../nodes";
import { deploySkaleDKG } from "../skaleDKG";
import { ethers } from "hardhat";

const deploySchainsInternalMock:
    (contractManager: ContractManager) => Promise<SchainsInternalMock>
    = deployFunctionFactory("SchainsInternalMock",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deploySkaleDKG(contractManager);
                                await deployNodes(contractManager);
                            },
                            async ( contractManager: ContractManager) => {
                                const schainsInternal = await defaultDeploy("SchainsInternalMock", contractManager) as SchainsInternalMock;

                                await schainsInternal.grantRole(await schainsInternal.SCHAIN_TYPE_MANAGER_ROLE(), (await ethers.getSigners())[0].address);

                                await schainsInternal.addSchainType(1, 16);
                                await schainsInternal.addSchainType(4, 16);
                                await schainsInternal.addSchainType(128, 16);
                                await schainsInternal.addSchainType(0, 2);
                                await schainsInternal.addSchainType(32, 4);

                                return schainsInternal;
                            });

export { deploySchainsInternalMock };
