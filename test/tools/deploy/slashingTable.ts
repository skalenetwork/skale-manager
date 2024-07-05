import {ContractManager, SlashingTable} from "../../../typechain-types";
import {deployFunctionFactory} from "./factory";

const name = "SlashingTable";

export const deploySlashingTable = deployFunctionFactory<SlashingTable>(name);
