import { ContractManager, SkaleToken } from "../../../typechain";
import { deployDelegationController } from "./delegation/delegationController";
import { deployPunisher } from "./delegation/punisher";
import { deployTokenState } from "./delegation/tokenState";
import { deployFunctionFactory } from "./factory";

const name = "SkaleToken";

async function deployDependencies(contractManager: ContractManager) {
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
}

export const deploySkaleToken: (contractManager: ContractManager) => Promise<SkaleToken> = deployFunctionFactory(name, deployDependencies);
