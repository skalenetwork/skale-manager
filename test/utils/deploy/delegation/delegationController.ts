import { ContractManagerInstance, DelegationControllerInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationPeriodManager } from "./delegationPeriodManager";
import { deployTimeHelpers } from "./timeHelpers";
import { deployTokenLaunchLocker } from "./tokenLaunchLocker";
import { deployValidatorService } from "./validatorService";

const deployDelegationController: (contractManager: ContractManagerInstance) => Promise<DelegationControllerInstance>
    = deployFunctionFactory("DelegationController",
                            async (contractManager: ContractManagerInstance) => {
                                await deployValidatorService(contractManager);
                                await deployTimeHelpers(contractManager);
                                await deployDelegationPeriodManager(contractManager);
                                await deployTokenLaunchLocker(contractManager);
                                await deploySkaleToken(contractManager);
                            });

export { deployDelegationController };
