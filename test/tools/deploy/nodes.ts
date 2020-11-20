import { ContractManagerInstance, NodesInstance } from "../../../types/truffle-contracts";
import { deployBounty } from "./bounty";
import { deployConstantsHolder } from "./constantsHolder";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";

const deployNodes: (contractManager: ContractManagerInstance) => Promise<NodesInstance>
    = deployFunctionFactory("Nodes",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployValidatorService(contractManager);
                                await deployBounty(contractManager);
                            });

export { deployNodes };
