import { ConstantsHolderInstance,
         ContractManagerInstance } from "../types/truffle-contracts";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

chai.should();
chai.use(chaiAsPromised);

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
    const simpleContractName: string = "Constants";
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address);

    const hash: string = web3.utils.soliditySha3(simpleContractName);
    assert.equal(await contractManager.contracts(hash), constantsHolder.address, "Address should be equal");
  });

  it("should destruct contract", async () => {
    // TODO: Remove before production
    await web3.eth.getCode(contractManager.address).should.not.be.eventually.equal("0x");
    await contractManager.destroyAndSend(user, {from: user})
      .should.be.eventually.rejected;
    await contractManager.destroyAndSend(deployer);
    await web3.eth.getCode(contractManager.address).should.be.eventually.equal("0x");
    // console.log
  });
});
