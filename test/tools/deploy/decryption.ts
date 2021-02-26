import { ContractManager, Decryption } from "../../../typechain";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

const deployDecryption: (contractManager: ContractManager) => Promise<Decryption>
    = deployFunctionFactory("Decryption",
                            async (_: ContractManager) => {
                                return undefined;
                            },
                            async (_: ContractManager) => {
                                return await deployWithConstructor("Decryption");
                            });

export { deployDecryption };
