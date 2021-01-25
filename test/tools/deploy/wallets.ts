import { ContractManagerInstance, WalletsInstance } from "../../../types/truffle-contracts";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";

const deployWallets:
    (contractManager: ContractManagerInstance) => Promise<WalletsInstance>
    = deployFunctionFactory("Wallets",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodes(contractManager);
                                await deployValidatorService(contractManager);
                                await deploySchainsInternal(contractManager);
                            });

export { deployWallets };
