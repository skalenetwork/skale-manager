import { ConstantsHolder, ContractManager } from "../../../typechain-types";
import { deployFunctionFactory } from "./factory";

const name = "ConstantsHolder";

export const deployConstantsHolder: (contractManager: ContractManager) => Promise<ConstantsHolder>
    = deployFunctionFactory(name);
