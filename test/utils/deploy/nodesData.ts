import { ContractManagerInstance, NodesDataContract, NodesDataInstance } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployFunctionFactory } from "./factory";

const NodesData: NodesDataContract = artifacts.require("./NodesData");

const deployNodesData: (contractManager: ContractManagerInstance) => Promise<NodesDataInstance>
    = deployFunctionFactory("NodesData",
                            async (contractManager: ContractManagerInstance) => {
                                await deployConstantsHolder(contractManager);
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const instance = await NodesData.new();
                                await instance.initialize(5, contractManager.address);
                                return instance;
                            });

export { deployNodesData };
