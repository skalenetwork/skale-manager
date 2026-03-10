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
    const skaleToken = await factory.deploy(contractManager, []) as unknown as SkaleToken;
    // Owner has minter role by default in tests
    await skaleToken.grantRole(await skaleToken.MINTER_ROLE(), (await ethers.getSigners())[0].getAddress());
    return skaleToken;
}

async function deployDependencies(contractManager: ContractManager) {
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployPunisher(contractManager);
    await deploySkaleManager(contractManager);

    const skaleToken = await ethers.getContractAt(
        "SkaleToken",
        await contractManager.getContract("SkaleToken")
    ) as unknown as SkaleToken;
    await skaleToken.grantRole(
        await skaleToken.MINTER_ROLE(),
        await contractManager.getContract("SkaleManager")
    );
}

export const deploySkaleToken = deployFunctionFactory<SkaleToken>(
    name,
    deployDependencies,
    deploy
);
