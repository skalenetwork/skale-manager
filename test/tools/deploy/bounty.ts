import { deployNodes } from "./nodes";
import { ContractManagerInstance, BountyV2Instance, BountyV2Contract } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployConstantsHolder } from "./constantsHolder";
import { deployTimeHelpers } from "./delegation/timeHelpers";
import { deployDelegationController } from "./delegation/delegationController";

const deployBounty: (contractManager: ContractManagerInstance) => Promise<BountyV2Instance>
    = deployFunctionFactory("Bounty",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deployTimeHelpers(contractManager);
                            });

export { deployBounty };