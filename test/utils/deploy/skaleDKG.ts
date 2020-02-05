import { ContractManagerInstance, SkaleDKGContract, SkaleDKGInstance } from "../../../types/truffle-contracts";
import { deployDecryption } from "./dectyption";
import { deployDelegationService } from "./delegation/delegationService";
import { deployECDH } from "./ecdh";
import { deployFunctionFactory } from "./factory";
import { deployNodesData } from "./nodesData";
import { deploySchainsFunctionalityInternal } from "./schainsFunctionalityInternal";
import { deploySlashingTable } from "./slashingTable";

const deploySkaleDKG: (contractManager: ContractManagerInstance) => Promise<SkaleDKGInstance>
    = deployFunctionFactory("SkaleDKG",
                            async (contractManager: ContractManagerInstance) => {
                                await deploySchainsFunctionalityInternal(contractManager);
                                await deployDelegationService(contractManager);
                                await deployNodesData(contractManager);
                                await deploySlashingTable(contractManager);
                                await deployECDH(contractManager);
                                await deployDecryption(contractManager);
                            },
                            async (contractManager: ContractManagerInstance) => {
                                const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");
                                return await SkaleDKG.new(contractManager.address);
                            });

export { deploySkaleDKG };
