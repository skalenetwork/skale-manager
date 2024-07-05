import {deployFunctionFactory} from "../factory";
import {ethers} from "hardhat";
import {TimeHelpersWithDebug} from "../../../../typechain-types";

export const deployTimeHelpersWithDebug = deployFunctionFactory<TimeHelpersWithDebug>(
    "TimeHelpersWithDebug",
    undefined,
    async () => {
        const factory = await ethers.getContractFactory("TimeHelpersWithDebug");
        const instance = await factory.deploy() as unknown as TimeHelpersWithDebug;
        await instance.initialize();
        return instance;
    }
);
