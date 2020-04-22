import { ContractManagerInstance, ECDHContract, ECDHInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";

const deployECDH: (contractManager: ContractManagerInstance) => Promise<ECDHInstance>
    = deployFunctionFactory("ECDH",
                            async (contractManager: ContractManagerInstance) => {
                                return undefined;
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const ECDH: ECDHContract = artifacts.require("./ECDH");
                                return await ECDH.new();
                            });

export { deployECDH };
