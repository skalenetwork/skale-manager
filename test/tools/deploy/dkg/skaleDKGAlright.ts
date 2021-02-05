import { ContractManagerInstance, SkaleDKGAlrightInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleDKG } from "../skaleDKG";

const deploySkaleDKGAlright: (contractManager: ContractManagerInstance) => Promise<SkaleDKGAlrightInstance>
    = deployFunctionFactory("SkaleDKGAlright",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySkaleDKGAlright };
