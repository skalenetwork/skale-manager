import { ContractManagerInstance, SlashingTableContract } from "../../../types/truffle-contracts";

const SlashingTable: SlashingTableContract = artifacts.require("./SlashingTable");
const name = "SlashingTable";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await SlashingTable.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

export async function deploySlashingTable(contractManager: ContractManagerInstance) {
    try {
        return SlashingTable.at(await contractManager.getContract(name));
    } catch (e) {
        return await deploy(contractManager);
    }
}
