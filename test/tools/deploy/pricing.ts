import { ContractManagerInstance, PricingInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";

const deployPricing: (contractManager: ContractManagerInstance) => Promise<PricingInstance>
    = deployFunctionFactory("Pricing",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodes(contractManager);
                                await deploySchainsInternal(contractManager);
                            });

export { deployPricing };
