import { ContractManagerInstance, PartialDifferencesTesterInstance } from "../../../../types/truffle-contracts";
import { deployWithConstructorFunctionFactory } from "../factory";

const deployPartialDifferencesTester: (contractManager: ContractManagerInstance) => Promise<PartialDifferencesTesterInstance>
    = deployWithConstructorFunctionFactory("PartialDifferencesTester",
                            async (contractManager: ContractManagerInstance) => {
                                return undefined;
                            });

export { deployPartialDifferencesTester };
