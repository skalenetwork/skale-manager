import { ContractManagerInstance, ReentrancyTesterInstance } from "../../../../types/truffle-contracts";
import { deployWithConstructorFunctionFactory } from "../factory";
import { deploySkaleToken } from "../skaleToken";

const deployReentrancyTester: (contractManager: ContractManagerInstance) => Promise<ReentrancyTesterInstance>
    = deployWithConstructorFunctionFactory("ReentrancyTester",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleToken(contractManager);
                            });

export { deployReentrancyTester };
