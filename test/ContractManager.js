const ContractManager = artifacts.require('./ContractManager')
const ConstantsHolder = artifacts.require('./ConstantsHolder')
const Simple = artifacts.require('./Simple')
const web3 = require('web3');

contract('ContractManager', ([deployer, user]) => {  
  let contractManager, constantsHolder, simple;

  beforeEach(async function() {
    contractManager = await ContractManager.new({from: deployer});        
    constantsHolder = await ConstantsHolder.new(contractManager.address, {from: deployer});
  });

  it("Shoud deploy", async () => {
    assert(true);
  });

  it("Should add a right contract address (ConstantsHolder) to the register", async () => {
    let simpleContractName = "ConstantsHolder";
    await contractManager.setContractsAddress(simpleContractName, constantsHolder.address);    

    let hash = web3.utils.soliditySha3(simpleContractName);        
    assert.equal(await contractManager.contracts(hash), constantsHolder.address, "Address should be equal");    
  });
})