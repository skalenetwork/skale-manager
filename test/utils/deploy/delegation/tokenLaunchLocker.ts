import { ContractManagerInstance, TokenLaunchLockerInstance } from "../../../../types/truffle-contracts";
import { deployConstantsHolder } from "../constantsHolder";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";
import { deployTimeHelpers } from "./timeHelpers";

const deployTokenLaunchLocker: (contractManager: ContractManagerInstance) => Promise<TokenLaunchLockerInstance>
    = deployFunctionFactory("TokenLaunchLocker",
                            async (contractManager: ContractManagerInstance) => {
                                await deployTimeHelpers(contractManager);
                                await deployDelegationController(contractManager);
                                await deployConstantsHolder(contractManager);
                            });

export { deployTokenLaunchLocker };
