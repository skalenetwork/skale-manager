import { ContractManagerInstance, SkaleManagerInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployDistributor } from "./delegation/distributor";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployMonitors } from "./monitors";
import { deployNodes } from "./nodes";
import { deploySchains } from "./schains";
import { deploySkaleToken } from "./skaleToken";
import { deployBounty } from "./bounty";

const deploySkaleManager: (contractManager: ContractManagerInstance) => Promise<SkaleManagerInstance>
    = deployFunctionFactory("SkaleManager",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchains(contractManager);
                                await deployValidatorService(contractManager);
                                await deployMonitors(contractManager);
                                await deployNodes(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deploySkaleToken(contractManager);
                                await deployDistributor(contractManager);
                                await deployBounty(contractManager);
                            });

export { deploySkaleManager };
