import { ContractManagerInstance, SkaleDKGResponseInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleDKG } from "../skaleDKG";

const deploySkaleDKGResponse: (contractManager: ContractManagerInstance) => Promise<SkaleDKGResponseInstance>
    = deployFunctionFactory("SkaleDKGResponse",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySkaleDKGResponse };
