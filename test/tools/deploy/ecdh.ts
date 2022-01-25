import { artifacts } from "hardhat";
import { ContractManager, ECDH } from "../../../typechain-types";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

export const deployECDH = deployFunctionFactory(
    "ECDH",
    async (contractManager: ContractManager) => {
        return undefined;
    },
    async (contractManager: ContractManager) => {
        return await deployWithConstructor("ECDH");
    }
) as (contractManager: ContractManager) => Promise<ECDH>;
