import { ContractManager, PartialDifferencesTester } from "../../../../typechain-types";
import { deployWithConstructor, deployWithConstructorFunctionFactory } from "../factory";

const deployPartialDifferencesTester: (contractManager: ContractManager) => Promise<PartialDifferencesTester>
    = deployWithConstructorFunctionFactory("PartialDifferencesTester",
                            async (_: ContractManager) => {
                                return undefined;
                            },
                            async (_: ContractManager) => {
                                return await deployWithConstructor("PartialDifferencesTester");
                            });

export { deployPartialDifferencesTester };
