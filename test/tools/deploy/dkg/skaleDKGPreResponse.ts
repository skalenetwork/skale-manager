import { ContractManagerInstance, SkaleDKGPreResponseInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleDKG } from "../skaleDKG";

const deploySkaleDKGPreResponse: (contractManager: ContractManagerInstance) => Promise<SkaleDKGPreResponseInstance>
    = deployFunctionFactory("SkaleDKGPreResponse",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySkaleDKGPreResponse };
