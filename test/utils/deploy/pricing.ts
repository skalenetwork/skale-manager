import { ContractManagerInstance, PricingInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsData } from "./schainsData";

const deployPricing: (contractManager: ContractManagerInstance) => Promise<PricingInstance>
    = deployFunctionFactory("Pricing",
                            async (contractManager: ContractManagerInstance) => {
                                await deployNodesData(contractManager);
                                await deploySchainsData(contractManager);
                            });

export { deployPricing };
