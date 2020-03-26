import { ContractManagerInstance, SkaleManagerInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployDistributor } from "./delegation/distributor";
import { deployValidatorService } from "./delegation/validatorService";
import { deployFunctionFactory } from "./factory";
import { deployManagerData } from "./managerData";
import { deployMonitorsFunctionality } from "./monitorsFunctionality";
import { deployNodes } from "./nodes";
import { deploySchainsFunctionality } from "./schainsFunctionality";
import { deploySkaleToken } from "./skaleToken";

const deploySkaleManager: (contractManager: ContractManagerInstance) => Promise<SkaleManagerInstance>
    = deployFunctionFactory("SkaleManager",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsFunctionality(contractManager);
                                await deployValidatorService(contractManager);
                                await deployMonitorsFunctionality(contractManager);
                                await deployNodes(contractManager);
                                await deployConstantsHolder(contractManager);
                                await deployManagerData(contractManager);
                                await deploySkaleToken(contractManager);
                                await deployDistributor(contractManager);
                            });

export { deploySkaleManager };
