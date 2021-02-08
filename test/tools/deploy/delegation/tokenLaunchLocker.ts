import { ContractManager, TokenLaunchLocker } from "../../../../typechain";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";
import { deployTimeHelpers } from "./timeHelpers";

const deployTokenLaunchLocker: (contractManager: ContractManager) => Promise<TokenLaunchLocker>
    = deployFunctionFactory("TokenLaunchLocker",
                            async (contractManager: ContractManager) => {
                                await deployTimeHelpers(contractManager);
                                await deployDelegationController(contractManager);
                                await deployConstantsHolder(contractManager);
                            });

export { deployTokenLaunchLocker };
