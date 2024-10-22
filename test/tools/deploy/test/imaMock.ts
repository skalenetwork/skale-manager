import {ImaMock} from "../../../../typechain-types";
import {deployWithConstructorFunctionFactory} from "../factory";

export const deployImaMock
    = deployWithConstructorFunctionFactory<ImaMock>("ImaMock");
