import { ContractManager, SkaleManagerMock } from "../../../../typechain";
import { deployWithConstructorFunctionFactory } from "../factory";

const deploySkaleManagerMock: (contractManager: ContractManager) => Promise<SkaleManagerMock>
    = deployWithConstructorFunctionFactory("SkaleManagerMock");

export { deploySkaleManagerMock };