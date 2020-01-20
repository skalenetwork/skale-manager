import { ContractManagerInstance, DelegationRequestManagerContract } from "../../../../types/truffle-contracts";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationController } from "./delegationController";
import { deployDelegationPeriodManager } from "./delegationPeriodManager";
import { deployTokenState } from "./tokenState";
import { deployValidatorService } from "./validatorService";

const DelegationRequestManager: DelegationRequestManagerContract = artifacts.require("./DelegationRequestManager");
const name = "DelegationRequestManager";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await DelegationRequestManager.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployValidatorService(contractManager);
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployDelegationPeriodManager(contractManager);
    await deploySkaleToken(contractManager);
}

export async function deployDelegationRequestManager(contractManager: ContractManagerInstance) {
    try {
        return DelegationRequestManager.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
