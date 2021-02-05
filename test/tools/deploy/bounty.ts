import { deployNodes } from "./nodes";
import { ContractManagerInstance, BountyV2Instance, BountyV2Contract } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployConstantsHolder } from "./constantsHolder";
import { deployTimeHelpers } from "./delegation/timeHelpers";
import { deployWallets } from "./wallets";

const deployBounty: (contractManager: ContractManagerInstance) => Promise<BountyV2Instance>
    = deployFunctionFactory("Bounty",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                                await deployNodes(contractManager);
                                await deployTimeHelpers(contractManager);
                                await deployWallets(contractManager);
                            },
                            async(contractManager: ContractManagerInstance) => {
                                const BountyV2: BountyV2Contract = artifacts.require("./BountyV2");
                                const instance = await BountyV2.new();
                                await instance.initialize(contractManager.address);
                                return instance;
                            });

export { deployBounty };