import { ContractManagerInstance, SkaleDKGInstance } from "../../../types/truffle-contracts";
// import { deployDecryption } from "./dectyption";
import { deployPunisher } from "./delegation/punisher";
// import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
import { deploySlashingTable } from "./slashingTable";

const deploySkaleDKG: (contractManager: ContractManagerInstance) => Promise<SkaleDKGInstance>
    = deployFunctionFactory("SkaleDKG",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                await deploySlashingTable(contractManager);
                                // await deployECDH(contractManager);
                                // await deployDecryption(contractManager);
                            });

export { deploySkaleDKG };
