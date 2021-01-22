import { ContractManagerInstance, SkaleManagerInstance } from "../../../types/truffle-contracts";
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
import { deployWallets } from "./wallets";

const deploySkaleManager: (contractManager: ContractManagerInstance) => Promise<SkaleManagerInstance>
    = deployFunctionFactory("SkaleManager",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchains(contractManager);
                                await deployValidatorService(contractManager);
                                await deployMonitors(contractManager);
                                await deployNodes(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deploySkaleToken(contractManager);
                                await deployDistributor(contractManager);
                                await deployNodeRotation(contractManager);
                                await deployBounty(contractManager);
                                await deployWallets(contractManager);
                            });

export { deploySkaleManager };
