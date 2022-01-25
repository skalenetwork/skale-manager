import { ContractManager, TokenState } from "../../../../typechain-types";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";
import { deployPunisher } from "./punisher";
import { deployTimeHelpers } from "./timeHelpers";

const name = "TokenState";

async function deployDependencies(contractManager: ContractManager) {
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
    await deployTimeHelpers(contractManager);
}

export const deployTokenState = deployFunctionFactory(
    name,
    deployDependencies
) as (contractManager: ContractManager) => Promise<TokenState>;
