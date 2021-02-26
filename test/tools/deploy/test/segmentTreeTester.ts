import { ContractManager, SegmentTreeTester } from "../../../../typechain";
import { deployWithLibraryWithConstructor } from "../factory";

const deploySegmentTreeTester: (contractManager: ContractManager) => Promise<SegmentTreeTester>
    = deployWithLibraryWithConstructor("SegmentTreeTester", ["SegmentTree"],
                            async (contractManager: ContractManager) => {
                                return undefined;
                            });

export { deploySegmentTreeTester };