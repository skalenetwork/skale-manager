import { deployFunctionFactory } from "../factory";
import { ethers } from "hardhat";
import { ContractManager, TimeHelpersWithDebug } from "../../../../typechain-types";

export const deployTimeHelpersWithDebug = deployFunctionFactory(
    "TimeHelpersWithDebug",
    undefined,
    async () => {
        const factory = await ethers.getContractFactory("TimeHelpersWithDebug");
        const instance = await factory.deploy() as TimeHelpersWithDebug;
        await instance.initialize();
        return instance;
    }
) as (contractManager: ContractManager) => Promise<TimeHelpersWithDebug>;
