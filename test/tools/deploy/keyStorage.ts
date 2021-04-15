import { ContractManager, KeyStorage } from "../../../typechain";
import { deployDecryption } from "./decryption";
import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deploySchainsInternal } from "./schainsInternal";

const deployKeyStorage: (contractManager: ContractManager) => Promise<KeyStorage>
    = deployFunctionFactory("KeyStorage",
                            async (contractManager: ContractManager) => {
                                await deploySchainsInternal(contractManager);
                                await deployECDH(contractManager);
                                await deployDecryption(contractManager);
                            });

export { deployKeyStorage };
