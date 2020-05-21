import { ContractManagerInstance, VestingInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";
import { deployTimeHelpers } from "./timeHelpers";

const deployVesting: (contractManager: ContractManagerInstance) => Promise<VestingInstance>
    = deployFunctionFactory("Vesting",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleToken(contractManager);
                                await deployTimeHelpers(contractManager);
                            });

export { deployVesting };
