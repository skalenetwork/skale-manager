const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ethereumjs_tx = require("ethereumjs-tx");

let pathToContracts = '../contracts';

let SkaleToken = path.resolve(__dirname, pathToContracts, 'SkaleToken.sol');
let SkaleManager = path.resolve(__dirname, pathToContracts, 'SkaleManager.sol');
let ManagerData = path.resolve(__dirname, pathToContracts, 'ManagerData.sol');
let NodesData = path.resolve(__dirname, pathToContracts, 'NodesData.sol');
let NodesFunctionality = path.resolve(__dirname, pathToContracts, 'NodesFunctionality.sol');
let ValidatorsData = path.resolve(__dirname, pathToContracts, 'ValidatorsData.sol');
let ValidatorsFunctionality = path.resolve(__dirname, pathToContracts, 'ValidatorsFunctionality.sol');
let SchainsData = path.resolve(__dirname, pathToContracts, 'SchainsData.sol');
let SchainsFunctionality = path.resolve(__dirname, pathToContracts, 'SchainsFunctionality.sol');
let ContractManager = path.resolve(__dirname, pathToContracts, 'ContractManager.sol');
let Ownable = path.resolve(__dirname, pathToContracts, 'Ownable.sol');
let Constants = path.resolve(__dirname, pathToContracts, 'Constants.sol');
let StandardToken = path.resolve(__dirname, pathToContracts, 'StandardToken.sol');
let Token = path.resolve(__dirname, pathToContracts, 'Token.sol');
let ContractReceiver = path.resolve(__dirname, pathToContracts, 'ContractReceiver.sol');
let Permissions = path.resolve(__dirname, pathToContracts, 'Permissions.sol');
//let Authorizable = path.resolve(__dirname, '../contracts', 'Authorizable.sol');
let GroupsData = path.resolve(__dirname, pathToContracts, 'GroupsData.sol');
let GroupsFunctionality = path.resolve(__dirname, pathToContracts, 'GroupsFunctionality.sol');

const networkName = process.env.NETWORK;
const privateKey =  process.env.ETH_PRIVATE_KEY;

let networks = require("../truffle.js");
let currentNetwork = networks['networks'][networkName];

const LINE = '======================================';

const Web3 = require('web3');
const PrivateKeyProvider = require("truffle-privatekey-provider");
const provider = new PrivateKeyProvider(privateKey, `http://${currentNetwork['host']}:${currentNetwork['port']}`);
const web3beta = new Web3(provider);
//const web3beta = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const account = web3beta['_provider']['address'];

async function deployContract(contractName, contract, options) {
  let object = solc.compile(contract, 1);
  console.log(LINE);
  console.log(`Deploying: ${contractName}, options: ${JSON.stringify(options)}`);
  const contractObj = new web3beta.eth.Contract(JSON.parse(object.contracts[contractName].interface));
  const result = await contractObj.deploy({data: '0x' + object.contracts[contractName].bytecode, arguments: options['arguments']})
    .send({gas: options['gas'], from: options['account']});
  //console.log(result);
  console.log(`${contractName} deployed to: ${result.options.address}`);
  return {receipt: result, contract: contractObj, address: result.options.address, abi: JSON.parse(object.contracts[contractName].interface)};
}

async function setContractsAddress(contractManagerResult, contractsName, contractsAddress, account) {
    console.log(LINE);
    console.log(`Adding contract ${contractsName} at address ${contractsAddress} to ContractManager`);
    //contractManagerResult.contract._address = contractManagerResult.address;
    let contractABI = new web3beta.eth.Contract(contractManagerResult.abi, contractManagerResult.address);
    const contractFunction = contractABI.methods.setContractsAddress(contractsName, contractsAddress);
    const functionABI = contractFunction.encodeABI();
    let tcnt = await web3beta.eth.getTransactionCount(account);
    const rawTx = {
        nonce: tcnt,
        gasLimit: web3beta.utils.toHex(200000),
        to: contractManagerResult.address,
        from: account,
        gasPrice: web3beta.utils.toHex(10000000000),
        data: functionABI
    };
    let tx = new ethereumjs_tx(rawTx);
    let key = Buffer.from(privateKey, "hex");
    tx.sign(key);
    let serializedTx = tx.serialize();
    let receipt = await web3beta.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"));
    console.log(`${contractsName} added to: ContractManager`);
    /*let receipt = await contractManagerResult.contract.methods.setContractsAddress(contractsName, contractsAddress).send({
        from: account,
        gas: 200000
    });*/
    //console.log(receipt);
    /*if (receipt['status'] !== true) {
        console.log(receipt);
        throw new Error('setContractsAddress failed, check the receipt above.');
    }*/
}

async function deploy() {
  console.log('Attempting to deploy from account: ', account);
  let contractManager = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8')
  }
  let contractManagerResult = await deployContract("ContractManager.sol:ContractManager", {sources: contractManager}, {gas: '8000000', 'account': account});
  let skaleToken = {
    'Token.sol': fs.readFileSync(Token, 'UTF-8'),
    'ContractReceiver.sol': fs.readFileSync(ContractReceiver, 'UTF-8'),
    'StandardToken.sol': fs.readFileSync(StandardToken, 'UTF-8'),
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'SkaleToken.sol': fs.readFileSync(SkaleToken, 'UTF-8')
  }
  let skaleTokenResult = await deployContract("SkaleToken.sol:SkaleToken", {sources: skaleToken}, {gas: '8000000', 'account': account, 'arguments': [contractManagerResult.address]});
  await setContractsAddress(contractManagerResult, "SkaleToken", skaleTokenResult.address, account);

  let constants = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'Constants.sol': fs.readFileSync(Constants, 'UTF-8')
  }  
  let constantsResult = await deployContract("Constants.sol:Constants", {sources: constants}, {'gas': '8000000', gasPrice: 0, 'account': account, 'arguments': [contractManagerResult.address]});
  await setContractsAddress(contractManagerResult, "Constants", constantsResult.address, account);
  
  let nodesData = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'NodesData.sol': fs.readFileSync(NodesData, 'UTF-8')
  }
  let nodesDataResult = await deployContract("NodesData.sol:NodesData", {sources: nodesData}, {
    gas: '8000000',
    'account': account,
    'arguments': [5260000, contractManagerResult.address]
  });
  await setContractsAddress(contractManagerResult, "NodesData", nodesDataResult.address, account);

  let nodesFunctionality = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'NodesFunctionality.sol': fs.readFileSync(NodesFunctionality, 'UTF-8')
  }
  let nodesFunctionalityResult = await deployContract(
    "NodesFunctionality.sol:NodesFunctionality", 
    {
      sources: nodesFunctionality }, 
    {
      gas: '8000000',
      'account': account,
      'arguments': [contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "NodesFunctionality", nodesFunctionalityResult.address, account);

  let validatorsData = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'GroupsData.sol': fs.readFileSync(GroupsData, 'UTF-8'),
    'ValidatorsData.sol': fs.readFileSync(ValidatorsData, 'UTF-8')
  }
  let validatorsDataResult = await deployContract(
    "ValidatorsData.sol:ValidatorsData",
    {
      sources: validatorsData },
    {
      gas: '8000000',
      'account': account,
      'arguments': ["ValidatorsFunctionality", contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "ValidatorsData", validatorsDataResult.address, account);

  let validatorsFunctionality = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'GroupsFunctionality.sol': fs.readFileSync(GroupsFunctionality, 'UTF-8'),
    'ValidatorsFunctionality.sol': fs.readFileSync(ValidatorsFunctionality, 'UTF-8')
  }
  let validatorsFunctionalityResult = await deployContract(
    "ValidatorsFunctionality.sol:ValidatorsFunctionality",
    {
      sources: validatorsFunctionality },
    {
      gas: '8000000',
      'account': account,
      'arguments': ["SkaleManager", "ValidatorsData", contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "ValidatorsFunctionality", validatorsFunctionalityResult.address, account);

  let schainsData = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'GroupsData.sol': fs.readFileSync(GroupsData, 'UTF-8'),
    'SchainsData.sol': fs.readFileSync(SchainsData, 'UTF-8')
  }
  let schainsDataResult = await deployContract(
    "SchainsData.sol:SchainsData",
    {
      sources: schainsData },
    {
      gas: '8000000',
      'account': account,
      'arguments': ["SchainsFunctionality", contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "SchainsData", schainsDataResult.address, account);

  let schainsFunctionality = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'GroupsFunctionality.sol': fs.readFileSync(GroupsFunctionality, 'UTF-8'),
    'SchainsFunctionality.sol': fs.readFileSync(SchainsFunctionality, 'UTF-8')
  }
  let schainsFunctionalityResult = await deployContract(
    "SchainsFunctionality.sol:SchainsFunctionality",
    {
      sources: schainsFunctionality },
    {
      gas: '8000000',
      'account': account,
      'arguments': ["SkaleManager", "SchainsData", contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "SchainsFunctionality", schainsFunctionalityResult.address, account);

  let managerData = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'ManagerData.sol': fs.readFileSync(ManagerData, 'UTF-8')
  }
  let managerDataResult = await deployContract(
    "ManagerData.sol:ManagerData",
    {
      sources: managerData },
    {
      gas: '4712388',
      'account': account,
      'arguments': ["SkaleManager", contractManagerResult.address] });                   
  await setContractsAddress(contractManagerResult, "ManagerData", managerDataResult.address, account);

  let skaleManager = {
    'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    'SkaleManager.sol': fs.readFileSync(SkaleManager, 'UTF-8')
  }
  let skaleManagerResult = await deployContract(
    "SkaleManager.sol:SkaleManager",
    {
      sources: skaleManager },
    {
      gas: '8000000',
      'account': account,
      'arguments': [contractManagerResult.address] });
  await setContractsAddress(contractManagerResult, "SkaleManager", skaleManagerResult.address, account);

  console.log('Deploy done, writing results...');
  let jsonObject = {
    skale_token_address: skaleTokenResult.address,
    skale_token_abi: skaleTokenResult.abi,
    nodes_data_address: nodesDataResult.address,
    nodes_data_abi: nodesDataResult.abi,
    nodes_functionality_address: nodesFunctionalityResult.address,
    nodes_functionality_abi: nodesFunctionalityResult.abi,
    validators_data_address: validatorsDataResult.address,
    validators_data_abi: validatorsDataResult.abi,
    validators_functionality_address: validatorsFunctionalityResult.address,
    validators_functionality_abi: validatorsFunctionalityResult.abi,
    schains_data_address: schainsDataResult.address,
    schains_data_abi: schainsDataResult.abi,
    schains_functionality_address: schainsFunctionalityResult.address,
    schains_functionality_abi: schainsFunctionalityResult.abi,
    manager_data_address: managerDataResult.address,
    manager_data_abi: managerDataResult.abi,
    skale_manager_address: skaleManagerResult.address,
    skale_manager_abi: skaleManagerResult.abi,
    constants_address: constantsResult.address,
    constants_abi: constantsResult.abi,
    contract_manager_address: contractManagerResult.address,
    contract_manager_abi: contractManagerResult.abi
  };

  fs.writeFile(`data/${networkName}.json`, JSON.stringify(jsonObject), function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(`Done, check ${networkName}.json file in data folder.`);
    process.exit(0);
  });
}
deploy();
//module.exports = deploy;
