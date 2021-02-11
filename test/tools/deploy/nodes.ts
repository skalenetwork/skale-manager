import { ContractManager, Nodes } from "../../../typechain";
import { deployBounty } from "./bounty";
import { deployConstantsHolder } from "./constantsHolder";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";

const deployNodes: (contractManager: ContractManager) => Promise<Nodes>
    = deployFunctionFactory("Nodes",
                            async (contractManager: ContractManager) => {
                                await deployConstantsHolder(contractManager);
                                await deployValidatorService(contractManager);
                                await deployBounty(contractManager);
                            });

export { deployNodes };
