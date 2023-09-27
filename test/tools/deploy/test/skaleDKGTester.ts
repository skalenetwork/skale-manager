import {deployPunisher} from "../delegation/punisher";
import {deployKeyStorage} from "../keyStorage";
import {deployWithLibraryFunctionFactory} from "../factory";
import {deployNodes} from "../nodes";
import {deploySchainsInternal} from "../schainsInternal";
import {deploySlashingTable} from "../slashingTable";
import {ContractManager, SkaleDKGTester} from "../../../../typechain-types";

const libraries = [
    "SkaleDkgAlright",
    "SkaleDkgBroadcast",
    "SkaleDkgComplaint",
    "SkaleDkgPreResponse",
    "SkaleDkgResponse"
]

export const deploySkaleDKGTester = deployWithLibraryFunctionFactory(
    "SkaleDKGTester",
    libraries,
    async (contractManager: ContractManager) => {
        await deploySchainsInternal(contractManager);
        await deployPunisher(contractManager);
        await deployNodes(contractManager);
        await deploySlashingTable(contractManager);
        await deployKeyStorage(contractManager);
    }
) as (contractManager: ContractManager) => Promise<SkaleDKGTester>;
