import { deployPunisher } from "./delegation/punisher";
import { deployKeyStorage } from "./keyStorage";
import { deployWithLibraryFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySlashingTable } from "./slashingTable";
import { deployNodeRotation } from "./nodeRotation";
import { ContractManager, SkaleDKG } from "../../../typechain";

const libraries = [
    "SkaleDkgAlright",
    "SkaleDkgBroadcast",
    "SkaleDkgComplaint",
    "SkaleDkgPreResponse",
    "SkaleDkgResponse"
]

const deploySkaleDKG: (contractManager: ContractManager) => Promise<SkaleDKG>
    = deployWithLibraryFunctionFactory("SkaleDKG", libraries,
                            async (contractManager: ContractManager) => {
                                await deploySchainsInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployNodeRotation(contractManager);
                                await deployKeyStorage(contractManager);
                            });

export { deploySkaleDKG };
