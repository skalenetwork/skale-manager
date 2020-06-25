import { ContractManagerInstance, KeyStorageInstance } from "../../../types/truffle-contracts";
import { deployDecryption } from "./dectyption";
// import { deployPunisher } from "./delegation/punisher";
import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";
// import { deploySlashingTable } from "./slashingTable";

const deployKeyStorage: (contractManager: ContractManagerInstance) => Promise<KeyStorageInstance>
    = deployFunctionFactory("KeyStorage",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                // await deployPunisher(contractManager);
                                await deployNodes(contractManager);
                                // await deploySlashingTable(contractManager);
                                await deployECDH(contractManager);
                                await deployDecryption(contractManager);
                            });

export { deployKeyStorage };
