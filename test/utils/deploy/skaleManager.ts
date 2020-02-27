import { ContractManagerInstance, SkaleManagerInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployDelegationService } from "./delegation/delegationService";
import { deploySkaleBalances } from "./delegation/skaleBalances";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployManagerData } from "./managerData";
import { deployMonitorsFunctionality } from "./monitorsFunctionality";
import { deployNodesData } from "./nodesData";
import { deployNodesFunctionality } from "./nodesFunctionality";
import { deploySchainsFunctionality } from "./schainsFunctionality";
import { deploySkaleToken } from "./skaleToken";

const deploySkaleManager: (contractManager: ContractManagerInstance) => Promise<SkaleManagerInstance>
    = deployFunctionFactory("SkaleManager",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySkaleBalances(contractManager);
                                await deploySchainsFunctionality(contractManager);
                                await deployNodesFunctionality(contractManager);
                                await deployValidatorService(contractManager);
                                await deployMonitorsFunctionality(contractManager);
                                await deployNodesData(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deployManagerData(contractManager);
                                await deploySkaleToken(contractManager);
                                await deployDelegationService(contractManager);
                            });

export { deploySkaleManager };
