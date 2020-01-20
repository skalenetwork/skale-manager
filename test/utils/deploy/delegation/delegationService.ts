import { ContractManagerInstance, DelegationServiceContract } from "../../../../types/truffle-contracts";
import { deploySkaleToken } from "../skaleToken";
import { deployDelegationController } from "./delegationController";
import { deployDelegationRequestManager } from "./delegationRequestManager";
import { deployDistributor } from "./distributor";
import { deploySkaleBalances } from "./skaleBalances";
import { deployTokenState } from "./tokenState";
import { deployValidatorService } from "./validatorService";

const DelegationService: DelegationServiceContract = artifacts.require("./DelegationService");
const name = "DelegationService";

async function deploy(contractManager: ContractManagerInstance) {
    const instance = await DelegationService.new(contractManager.address);
    await contractManager.setContractsAddress(name, instance.address);
    return instance;
}

async function deployDependencies(contractManager: ContractManagerInstance) {
    await deployTokenState(contractManager);
    await deployDelegationController(contractManager);
    await deployDelegationRequestManager(contractManager);
    await deployValidatorService(contractManager);
    await deployDistributor(contractManager);
    await deploySkaleBalances(contractManager);
    await deploySkaleToken(contractManager);
}

export async function deployDelegationService(contractManager: ContractManagerInstance) {
    try {
        return DelegationService.at(await contractManager.getContract(name));
    } catch (e) {
        const instance = await deploy(contractManager);
        await deployDependencies(contractManager);
        return instance;
    }
}
