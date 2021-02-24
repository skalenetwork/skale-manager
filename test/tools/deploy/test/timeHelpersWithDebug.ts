import { deployFunctionFactory } from "../factory";
import { ethers } from "hardhat";
import { ContractManager, TimeHelpersWithDebug } from "../../../../typechain";

const deployTimeHelpersWithDebug: (contractManager: ContractManager) => Promise<TimeHelpersWithDebug>
    = deployFunctionFactory("TimeHelpersWithDebug",
                            undefined,
                            async (contractManager: ContractManager) => {
                                const factory = await ethers.getContractFactory("TimeHelpersWithDebug");
                                const instance = await factory.deploy();
                                await instance.initialize();
                                return instance;
                            });

export { deployTimeHelpersWithDebug };
