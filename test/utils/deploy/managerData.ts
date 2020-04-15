import { ContractManagerInstance, ManagerDataInstance } from "../../../types/truffle-contracts";
import { deployFunctionFactory } from "./factory";

const deployManagerData: (contractManager: ContractManagerInstance) => Promise<ManagerDataInstance>
    = deployFunctionFactory("ManagerData");

export { deployManagerData };
