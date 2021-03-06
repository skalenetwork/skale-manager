import { artifacts } from "hardhat";
import { ContractManager, ECDH } from "../../../typechain";
import { deployFunctionFactory, deployWithConstructor } from "./factory";

const deployECDH: (contractManager: ContractManager) => Promise<ECDH>
    = deployFunctionFactory("ECDH",
                            async (contractManager: ContractManager) => {
                                return undefined;
                            },
                            async (contractManager: ContractManager) => {
                                return await deployWithConstructor("ECDH");
                            });

export { deployECDH };
