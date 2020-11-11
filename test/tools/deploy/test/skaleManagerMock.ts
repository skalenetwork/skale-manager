import { ContractManagerInstance, SkaleManagerMockInstance } from "../../../../types/truffle-contracts";
import { deployWithConstructorFunctionFactory } from "../factory";

const deploySkaleManagerMock: (contractManager: ContractManagerInstance) => Promise<SkaleManagerMockInstance>
    = deployWithConstructorFunctionFactory("SkaleManagerMock");

export { deploySkaleManagerMock };