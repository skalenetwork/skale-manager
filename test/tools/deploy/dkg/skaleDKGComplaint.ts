import { ContractManagerInstance, SkaleDKGComplaintInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deploySkaleDKG } from "../skaleDKG";

const deploySkaleDKGComplaint: (contractManager: ContractManagerInstance) => Promise<SkaleDKGComplaintInstance>
    = deployFunctionFactory("SkaleDKGComplaint",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleDKG(contractManager);
                            });

export { deploySkaleDKGComplaint };
