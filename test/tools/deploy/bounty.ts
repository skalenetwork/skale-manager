import { deployNodes } from "./nodes";
import { ContractManagerInstance, BountyInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployConstantsHolder } from "./constantsHolder";

const deployBounty: (contractManager: ContractManagerInstance) => Promise<BountyInstance>
    = deployFunctionFactory("Bounty",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                            });

export { deployBounty };