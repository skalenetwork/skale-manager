import { ContractManagerInstance, PricingInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsData } from "./schainsData";

const deployPricing: (contractManager: ContractManagerInstance) => Promise<PricingInstance>
    = deployFunctionFactory("Pricing",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodes(contractManager);
                                await deploySchainsData(contractManager);
                            });

export { deployPricing };
