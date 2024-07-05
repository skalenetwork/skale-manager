import {ethers} from "hardhat";
import {ContractManager, SkaleToken} from "../../../typechain-types";
import {deployDelegationController} from "./delegation/delegationController";
import {deployPunisher} from "./delegation/punisher";
import {deployTokenState} from "./delegation/tokenState";
import {deployFunctionFactory} from "./factory";
import {deploySkaleManager} from "./skaleManager";

const name = "SkaleToken";

async function deploy(contractManager: ContractManager) {
    const factory = await ethers.getContractFactory(name);
    return await factory.deploy(contractManager, []) as unknown as SkaleToken;
}

async function deployDependencies(contractManager: ContractManager) {
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
    await deploySkaleManager(contractManager);
}

export const deploySkaleToken = deployFunctionFactory<SkaleToken>(
    name,
    deployDependencies,
    deploy
);
