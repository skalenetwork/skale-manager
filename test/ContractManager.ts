import { ConstantsHolderInstance,
         ContractManager } from "../types/truffle-contracts";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";

contract("ContractManager", ([deployer, user]) => {
  let contractManager: ContractManager;
  let constantsHolder: ConstantsHolderInstance;

  beforeEach(async () => {
    contractManager = await deployContractManager();
    constantsHolder = await deployConstantsHolder(contractManager);
  });

  it("Should add a right contract address (ConstantsHolder) to the register", async () => {
    const simpleContractName: string = "Constants";
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address, {from: user})
      .should.be.eventually.rejectedWith("Ownable: caller is not the owner");
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address);

    const hash: string = web3.utils.soliditySha3(simpleContractName);
    assert.equal(await contractManager.contracts(hash), constantsHolder.address, "Address should be equal");
  });
});
