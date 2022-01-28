import { ContractManager, Nodes } from "../../../typechain-types";
import { deployBounty } from "./bounty";
import { deployConstantsHolder } from "./constantsHolder";
import { deployValidatorService } from "./delegation/validatorService";
import { deployWithLibraryFunctionFactory } from "./factory";
import { deployNodeRotation } from "./nodeRotation";

export const deployNodes = deployWithLibraryFunctionFactory(
    "Nodes",
    ["SegmentTree"],
    async (contractManager: ContractManager) => {
        await deployConstantsHolder(contractManager);
        await deployValidatorService(contractManager);
        await deployBounty(contractManager);
        await deployNodeRotation(contractManager);
    }
) as (contractManager: ContractManager) => Promise<Nodes>;
