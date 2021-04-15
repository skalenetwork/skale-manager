import { ContractManager, Nodes } from "../../../../typechain";
import { deployBounty } from "../bounty";
import { deployConstantsHolder } from "../constantsHolder";
import { deployValidatorService } from "../delegation/validatorService";
import { deployWithLibraryFunctionFactory } from "../factory";

const deployNodesTester: (contractManager: ContractManager) => Promise<Nodes>
    = deployWithLibraryFunctionFactory(
        "NodesTester",
        ["SegmentTree"],
        async (contractManager: ContractManager) => {
            await deployConstantsHolder(contractManager);
            await deployValidatorService(contractManager);
            await deployBounty(contractManager);
        }
    );

export { deployNodesTester };