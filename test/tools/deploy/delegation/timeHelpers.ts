import { ContractManagerInstance,
    TimeHelpersContract } from "../../../../types/truffle-contracts";

const TimeHelpers: TimeHelpersContract = artifacts.require("./TimeHelpers");
const name = "TimeHelpers";

export async function deployTimeHelpers(contractManager: ContractManagerInstance) {
    try {
        const address = await contractManager.getContract(name);
        return TimeHelpers.at(address);
    } catch (e) {
        const timeHelpers = await TimeHelpers.new();
        await contractManager.setContractsAddress(name, timeHelpers.address);
        return timeHelpers;
    }
}
