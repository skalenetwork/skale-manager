import {ConstantsHolder, ContractManager} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";

const name = "ConstantsHolder";

export const deployConstantsHolder = deployFunctionFactory(name) as (contractManager: ContractManager) => Promise<ConstantsHolder>;
