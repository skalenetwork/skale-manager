import { deployNodes } from "./nodes";
import { ContractManager, BountyV2 } from "../../../typechain";
import { defaultDeploy, deployFunctionFactory } from "./factory";
import { deployConstantsHolder } from "./constantsHolder";
import { deployTimeHelpers } from "./delegation/timeHelpers";
import { deployWallets } from "./wallets";

const deployBounty: (contractManager: ContractManager) => Promise<BountyV2>
    = deployFunctionFactory("Bounty",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deployTimeHelpers(contractManager);
                                await deployWallets(contractManager);
                            },
                            async(contractManager: ContractManager) => {
                                return await defaultDeploy("BountyV2", contractManager);
                            });

export { deployBounty };