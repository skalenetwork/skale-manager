import { ContractManagerInstance, TokenLaunchManagerInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";
import { deployTokenLaunchLocker } from "./tokenLaunchLocker";

const deployTokenLaunchManager: (contractManager: ContractManagerInstance) => Promise<TokenLaunchManagerInstance>
    = deployFunctionFactory("TokenLaunchManager",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleToken(contractManager);
                                await deployTokenLaunchLocker(contractManager);
                            });

export { deployTokenLaunchManager };
