import { ContractManagerInstance, DecryptionContract, DecryptionInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";

const deployDecryption: (contractManager: ContractManagerInstance) => Promise<DecryptionInstance>
    = deployFunctionFactory("Decryption",
                            async (contractManager: ContractManagerInstance) => {
                                return undefined;
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const Decryption: DecryptionContract = artifacts.require("./Decryption");
                                return await Decryption.new();
                            });

export { deployDecryption };
