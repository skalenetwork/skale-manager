import {ConstantsHolderContract,
        ConstantsHolderInstance,
        ContractManagerContract,
        ContractManagerInstance} from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");

contract("ContractManager", ([deployer, user]) => {
  let contractManager: ContractManagerInstance;
  let constantsHolder: ConstantsHolderInstance;

  beforeEach(async () => {
    contractManager = await ContractManager.new({from: deployer});
    constantsHolder = await ConstantsHolder.new(contractManager.address, {from: deployer});
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
