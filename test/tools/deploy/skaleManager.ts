import { deployConstantsHolder } from "./constantsHolder";
import { deployDistributor } from "./delegation/distributor";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchains } from "./schains";
import { deploySkaleToken } from "./skaleToken";
import { deployNodeRotation } from "./nodeRotation";
import { deployBounty } from "./bounty";
import { deployWallets } from "./wallets";
import { ContractManager, SkaleManager } from "../../../typechain-types";

export const deploySkaleManager = deployFunctionFactory(
    "SkaleManager",
    async (contractManager: ContractManager) => {
        await deploySchains(contractManager);
        await deployValidatorService(contractManager);
        await deployNodes(contractManager);
        await deployConstantsHolder(contractManager);
        await deploySkaleToken(contractManager);
        await deployDistributor(contractManager);
        await deployNodeRotation(contractManager);
        await deployBounty(contractManager);
        await deployWallets(contractManager);
    }
) as (contractManager: ContractManager) => Promise<SkaleManager>;
