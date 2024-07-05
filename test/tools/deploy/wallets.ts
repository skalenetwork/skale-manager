import {ContractManager, Wallets} from "../../../typechain-types";
import {deployValidatorService} from "./delegation/validatorService";
import {deployFunctionFactory} from "./factory";
import {deployNodes} from "./nodes";
import {deploySchainsInternal} from "./schainsInternal";

export const deployWallets = deployFunctionFactory<Wallets>(
    "Wallets",
    async (contractManager: ContractManager) => {
        await deployNodes(contractManager);
        await deployValidatorService(contractManager);
        await deploySchainsInternal(contractManager);
    }
);
