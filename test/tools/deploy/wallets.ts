import { ContractManager, Wallets } from "../../../typechain";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";

const deployWallets:
    (contractManager: ContractManager) => Promise<Wallets>
    = deployFunctionFactory("Wallets",
                            async (contractManager: ContractManager) => {
                                await deployNodes(contractManager);
                                await deployValidatorService(contractManager);
                                await deploySchainsInternal(contractManager);
                            });

export { deployWallets };
