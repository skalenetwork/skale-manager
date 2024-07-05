import {SegmentTreeTester} from "../../../../typechain-types";
import {deployWithLibraryWithConstructor} from "../factory";

export const deploySegmentTreeTester = deployWithLibraryWithConstructor<SegmentTreeTester>(
    "SegmentTreeTester",
    ["SegmentTree"]
);
