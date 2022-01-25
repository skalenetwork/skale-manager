import { ContractManager, SegmentTreeTester } from "../../../../typechain-types";
import { deployWithLibraryWithConstructor } from "../factory";

export const deploySegmentTreeTester = deployWithLibraryWithConstructor(
    "SegmentTreeTester",
    ["SegmentTree"],
    async (contractManager: ContractManager) => {
        return undefined;
    }
) as (contractManager: ContractManager) => Promise<SegmentTreeTester>;
