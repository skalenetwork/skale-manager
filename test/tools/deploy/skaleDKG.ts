import { ContractManagerInstance, SkaleDKGInstance } from "../../../types/truffle-contracts";
import { deployPunisher } from "./delegation/punisher";
import { deployKeyStorage } from "./keyStorage";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySlashingTable } from "./slashingTable";
import { deployNodeRotation } from "./nodeRotation";

const deploySkaleDKG: (contractManager: ContractManagerInstance) => Promise<SkaleDKGInstance>
    = deployFunctionFactory("SkaleDKG",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployNodeRotation(contractManager);
                                await deployKeyStorage(contractManager);
                            });

export { deploySkaleDKG };
