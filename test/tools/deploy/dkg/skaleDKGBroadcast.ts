import { ContractManagerInstance, SkaleDKGBroadcastInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleDKG } from "../skaleDKG";

const deploySkaleDKGBroadcast: (contractManager: ContractManagerInstance) => Promise<SkaleDKGBroadcastInstance>
    = deployFunctionFactory("SkaleDKGBroadcast",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySkaleDKGBroadcast };
