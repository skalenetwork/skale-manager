import { ContractManagerInstance, PunisherInstance } from "../../../../types/truffle-contracts";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";
import { deployValidatorService } from "./validatorService";

const deployPunisher: (contractManager: ContractManagerInstance) => Promise<PunisherInstance>
    = deployFunctionFactory("Punisher",
                            async (contractManager: ContractManagerInstance) => {
                                await deployDelegationController(contractManager);
                                await deployValidatorService(contractManager);
                            });

export { deployPunisher };
