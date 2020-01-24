import { ContractManagerInstance, NodesFunctionalityContract } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";
import { deployValidatorService } from "./delegation/validatorService";
import { deployNodesData } from "./nodesData";

const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const name = "NodesFunctionality";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await NodesFunctionality.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployNodesData(contractManager);
    await deployValidatorService(contractManager);
    await deployConstantsHolder(contractManager);
}

export async function deployNodesFunctionality(contractManager: ContractManagerInstance) {
    try {
        return NodesFunctionality.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
