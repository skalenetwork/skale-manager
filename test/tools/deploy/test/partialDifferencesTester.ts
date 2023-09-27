import {ContractManager, PartialDifferencesTester} from "../../../../typechain-types";
import {deployWithConstructor, deployWithConstructorFunctionFactory} from "../factory";

export const deployPartialDifferencesTester = deployWithConstructorFunctionFactory(
    "PartialDifferencesTester",
    undefined,
    async () => {
        return await deployWithConstructor("PartialDifferencesTester");
    }
) as (contractManager: ContractManager) => Promise<PartialDifferencesTester>;
