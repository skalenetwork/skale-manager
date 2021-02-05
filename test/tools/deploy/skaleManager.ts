import { deployConstantsHolder } from "./constantsHolder";
import { deployDistributor } from "./delegation/distributor";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployMonitors } from "./monitors";
import { deployNodes } from "./nodes";
import { deploySchains } from "./schains";
import { deploySkaleToken } from "./skaleToken";
import { deployNodeRotation } from "./nodeRotation";
import { deployBounty } from "./bounty";
import { ContractManager, SkaleManager } from "../../../typechain";

const deploySkaleManager: (contractManager: ContractManager) => Promise<SkaleManager>
    = deployFunctionFactory("SkaleManager",
                            async (contractManager: ContractManager) => {
                                await deploySchains(contractManager);
                                await deployValidatorService(contractManager);
                                await deployMonitors(contractManager);
                                await deployNodes(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deploySkaleToken(contractManager);
                                await deployDistributor(contractManager);
                                await deployNodeRotation(contractManager);
                                await deployBounty(contractManager);
                            });

export { deploySkaleManager };
