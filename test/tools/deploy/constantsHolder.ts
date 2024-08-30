import {ConstantsHolder} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";

const name = "ConstantsHolder";

export const deployConstantsHolder = deployFunctionFactory<ConstantsHolder>(name);
