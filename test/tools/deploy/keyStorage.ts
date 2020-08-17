import { ContractManagerInstance, KeyStorageInstance } from "../../../types/truffle-contracts";
import { deployDecryption } from "./dectyption";
import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deploySchainsInternal } from "./schainsInternal";

const deployKeyStorage: (contractManager: ContractManagerInstance) => Promise<KeyStorageInstance>
    = deployFunctionFactory("KeyStorage",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsInternal(contractManager);
                                await deployECDH(contractManager);
                                await deployDecryption(contractManager);
                            });

export { deployKeyStorage };
