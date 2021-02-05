import { deployPunisher } from "../delegation/punisher";
import { deployKeyStorage } from "../keyStorage";
import { deployFunctionFactory } from "../factory";
import { deployNodes } from "../nodes";
import { deploySchainsInternal } from "../schainsInternal";
import { deploySlashingTable } from "../slashingTable";
import { ContractManager, SkaleDKGTester } from "../../../../typechain";

const deploySkaleDKGTester: (contractManager: ContractManager) => Promise<SkaleDKGTester>
    = deployFunctionFactory("SkaleDKGTester",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployKeyStorage(contractManager);
                            });

export { deploySkaleDKGTester };