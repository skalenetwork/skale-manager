import {Decryption} from "../../../typechain-types";
import {deployFunctionFactory, deployWithConstructor} from "./factory";

export const deployDecryption = deployFunctionFactory<Decryption>(
    "Decryption",
    () => Promise.resolve(undefined),
    async () => {
        return await deployWithConstructor("Decryption");
    }
);
