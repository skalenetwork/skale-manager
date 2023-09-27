import {ContractManager, SegmentTreeTester} from "../../../../typechain-types";
import {deployWithLibraryWithConstructor} from "../factory";

export const deploySegmentTreeTester = deployWithLibraryWithConstructor(
    "SegmentTreeTester",
    ["SegmentTree"]
) as (contractManager: ContractManager) => Promise<SegmentTreeTester>;
