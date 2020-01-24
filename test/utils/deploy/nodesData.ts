import { ContractManagerInstance, NodesDataContract } from "../../../types/truffle-contracts";
import { deployConstantsHolder } from "./constantsHolder";

const NodesData: NodesDataContract = artifacts.require("./NodesData");
const name = "NodesData";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await NodesData.new(5, contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployConstantsHolder(contractManager);
}

export async function deployNodesData(contractManager: ContractManagerInstance) {
    try {
        return NodesData.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
