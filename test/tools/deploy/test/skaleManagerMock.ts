import {ContractManager, SkaleManagerMock} from "../../../../typechain-types";
import {deployWithConstructorFunctionFactory} from "../factory";

export const deploySkaleManagerMock
    = deployWithConstructorFunctionFactory("SkaleManagerMock") as (contractManager: ContractManager) => Promise<SkaleManagerMock>;
