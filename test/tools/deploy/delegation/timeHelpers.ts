import {TimeHelpers} from "../../../../typechain-types";
import {deployWithConstructor, deployWithConstructorFunctionFactory} from "../factory";

const name = "TimeHelpers";

export const deployTimeHelpers = deployWithConstructorFunctionFactory<TimeHelpers>(
    name,
    () => Promise.resolve(undefined),
    async () => {
        return await deployWithConstructor(name);
    }
);
