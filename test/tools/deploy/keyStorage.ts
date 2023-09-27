import {ContractManager, KeyStorage} from "../../../typechain-types";
import {deployDecryption} from "./decryption";
import {deployECDH} from "./ecdh";
import {deployFunctionFactory} from "./factory";
import {deploySchainsInternal} from "./schainsInternal";

export const deployKeyStorage = deployFunctionFactory(
    "KeyStorage",
    async (contractManager: ContractManager) => {
        await deploySchainsInternal(contractManager);
        await deployECDH(contractManager);
        await deployDecryption(contractManager);
    }
) as (contractManager: ContractManager) => Promise<KeyStorage>;
