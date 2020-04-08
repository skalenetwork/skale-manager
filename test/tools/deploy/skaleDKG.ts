import { ContractManagerInstance, SkaleDKGInstance } from "../../../types/truffle-contracts";
import { deployDecryption } from "./dectyption";
import { deployPunisher } from "./delegation/punisher";
import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsFunctionalityInternal } from "./schainsFunctionalityInternal";
import { deploySlashingTable } from "./slashingTable";

const deploySkaleDKG: (contractManager: ContractManagerInstance) => Promise<SkaleDKGInstance>
    = deployFunctionFactory("SkaleDKG",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsFunctionalityInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodesData(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployECDH(contractManager);
                                await deployDecryption(contractManager);
                            });

export { deploySkaleDKG };
