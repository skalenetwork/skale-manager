import { ContractManager, SlashingTable } from "../../../typechain";
import { deployFunctionFactory } from "./factory";

const name = "SlashingTable";

export const deploySlashingTable: (contractManager: ContractManager) => Promise<SlashingTable> = deployFunctionFactory(name);
