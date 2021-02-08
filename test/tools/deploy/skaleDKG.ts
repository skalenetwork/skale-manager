import { deployPunisher } from "./delegation/punisher";
import { deployKeyStorage } from "./keyStorage";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySlashingTable } from "./slashingTable";
import { deployNodeRotation } from "./nodeRotation";
import { deploySkaleDKGAlright } from "./dkg/skaleDKGAlright";
import { deploySkaleDKGBroadcast } from "./dkg/skaleDKGBroadcast";
import { deploySkaleDKGComplaint } from "./dkg/skaleDKGComplaint";
import { deploySkaleDKGPreResponse } from "./dkg/skaleDKGPreResponse";
import { deploySkaleDKGResponse } from "./dkg/skaleDKGResponse";
import { ContractManager, SkaleDKG } from "../../../typechain";

const deploySkaleDKG: (contractManager: ContractManager) => Promise<SkaleDKG>
    = deployFunctionFactory("SkaleDKG",
                            async (contractManager: ContractManager) => {
                                await deploySchainsInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployNodeRotation(contractManager);
                                await deployKeyStorage(contractManager);
                                await deploySkaleDKGAlright(contractManager);
                                await deploySkaleDKGBroadcast(contractManager);
                                await deploySkaleDKGComplaint(contractManager);
                                await deploySkaleDKGPreResponse(contractManager);
                                await deploySkaleDKGResponse(contractManager);
                            });

export { deploySkaleDKG };
