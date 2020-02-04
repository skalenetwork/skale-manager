import { ConstantsHolderInstance,
         ContractManagerInstance } from "../types/truffle-contracts";
import { deployConstantsHolder } from "./utils/deploy/constantsHolder";
import { deployContractManager } from "./utils/deploy/contractManager";

contract("ContractManager", ([deployer, user]) => {
  let contractManager: ContractManagerInstance;
  let constantsHolder: ConstantsHolderInstance;

  beforeEach(async () => {
    contractManager = await deployContractManager();
    constantsHolder = await deployConstantsHolder(contractManager);
  });

  it("Should deploy", async () => {
    assert(true);
  });

  it("Should add a right contract address (ConstantsHolder) to the register", async () => {
    const simpleContractName: string = "ConstantsHolder";
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address);

    const hash: string = web3.utils.soliditySha3(simpleContractName);
    assert.equal(await contractManager.contracts(hash), constantsHolder.address, "Address should be equal");
  });
});
