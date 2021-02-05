import { ContractManager, Pricing } from "../../../typechain";
import { deployFunctionFactory } from "./factory";
import { deployNodes } from "./nodes";
import { deploySchainsInternal } from "./schainsInternal";

const deployPricing: (contractManager: ContractManager) => Promise<Pricing>
    = deployFunctionFactory("Pricing",
                            async (contractManager: ContractManager) => {
                                await deployNodes(contractManager);
                                await deploySchainsInternal(contractManager);
                            });

export { deployPricing };
