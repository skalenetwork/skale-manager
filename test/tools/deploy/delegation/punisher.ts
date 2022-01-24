import { ContractManager, Punisher } from "../../../../typechain-types";
import { deployFunctionFactory } from "../factory";
import { deployDelegationController } from "./delegationController";
import { deployValidatorService } from "./validatorService";

const deployPunisher: (contractManager: ContractManager) => Promise<Punisher>
    = deployFunctionFactory("Punisher",
                            async (contractManager: ContractManager) => {
                                await deployDelegationController(contractManager);
                                await deployValidatorService(contractManager);
                            });

export { deployPunisher };
