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
                            },
                            async(contractManager: ContractManagerInstance) => {
                                const BountyV2: BountyV2Contract = artifacts.require("./BountyV2");
                                const instance = await BountyV2.new();
                                // some contracts have to be deployed before BountyV2 initialization
                                await deployTimeHelpers(contractManager);
                                await deployDelegationController(contractManager);
                                await instance.initialize(contractManager.address, 0);
                                return instance;
                            });

export { deployBounty };