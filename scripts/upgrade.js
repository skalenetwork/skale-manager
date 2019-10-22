const fs = require("fs");
const path = require("path");
const solc = require("solc");

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
let ContractReceiver = path.resolve(__dirname, pathToContracts, 'ContractReceiver.sol');
let Permissions = path.resolve(__dirname, pathToContracts, 'Permissions.sol');
//let Authorizable = path.resolve(__dirname, '../contracts', 'Authorizable.sol');
let GroupsData = path.resolve(__dirname, pathToContracts, 'GroupsData.sol');
let GroupsFunctionality = path.resolve(__dirname, pathToContracts, 'GroupsFunctionality.sol');

const networkName = process.env.NETWORK;
const privateKey =  process.env.ETH_PRIVATE_KEY;

let networks = require("../truffle-config.js");
let file = require("../data/local.json");
let currentNetwork = networks['networks'][networkName];

const LINE = '======================================';

const Web3 = require('web3');
const PrivateKeyProvider = require("truffle-hdwallet-provider");
const provider = new PrivateKeyProvider(privateKey, `http://${currentNetwork['host']}:${currentNetwork['port']}`);
//const web3beta = new Web3(provider);
const web3beta = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const account = "0x990f9e25e4bc00b930776f2cc2b4a864a9bad85f";


async function deployContract(contractName, realContractName, contract, options) {
    let object = JSON.parse(solc.compile(JSON.stringify(contract)));
    console.log(object.contracts[contractName][realContractName].abi);
    console.log(LINE);
    console.log(`Deploying: ${contractName}, options: ${JSON.stringify(options)}`);
    const contractObj = new web3beta.eth.Contract(object.contracts[contractName][realContractName].abi);
    const result = await contractObj.deploy({data: '0x' + object.contracts[contractName][realContractName].evm.bytecode.object, arguments: options['arguments']})
        .send({gas: options['gas'], from: options['account']});
                //console.log(result);
    console.log(`${contractName} deployed to: ${result.options.address}`);
    return {receipt: result, contract: contractObj, address: result.options.address, abi: object.contracts[contractName][realContractName].abi};
}

async function setContractsAddress(contractManagerAddress, contractManagerABI, contractsName, contractsAddress, account) {
    console.log(LINE);
    console.log(`Adding contract ${contractsName} at address ${contractsAddress} to ContractManager`);
    const contractObj = new web3beta.eth.Contract(contractManagerABI, contractManagerAddress);
    let receipt = await contractObj.methods.setContractsAddress(contractsName, contractsAddress).send({
        from: account,
        gas: 200000
    });
    if (receipt['status'] !== true) {
        console.log(receipt);
        throw new Error('setContractsAddress failed, check the receipt above.');
    } else {
        console.log("Contract added");
    }
}

async function deploy() {
    // let validatorsFunctionality = {
    //     'Ownable.sol': fs.readFileSync(Ownable, 'UTF-8'),
    //     'ContractManager.sol': fs.readFileSync(ContractManager, 'UTF-8'),
    //     'Permissions.sol': fs.readFileSync(Permissions, 'UTF-8'),
    //     'GroupsFunctionality.sol': fs.readFileSync(GroupsFunctionality, 'UTF-8'),
    //     'ValidatorsFunctionality.sol': fs.readFileSync(ValidatorsFunctionality, 'UTF-8')
    // }
    // let validatorsFunctionalityResult = await deployContract(
    //         "ValidatorsFunctionality.sol:ValidatorsFunctionality",
    //         {
    //             sources: validatorsFunctionality },
    //             {
    //                 gas: '8000000',
    //                 'account': account,
    //                 'arguments': ["SkaleManager", "ValidatorsData", file['contract_manager_address']] });
    // await setContractsAddress(file['contract_manager_address'], file['contract_manager_abi'], "ValidatorsFunctionality", validatorsFunctionalityResult.address, account);

    let schainsFunctionality = {
        'Ownable.sol': {content:fs.readFileSync(Ownable, 'UTF-8')},
        'ContractManager.sol': {content:fs.readFileSync(ContractManager, 'UTF-8')},
        'Permissions.sol': {content:fs.readFileSync(Permissions, 'UTF-8')},
        'SchainsFunctionality.sol': {content:fs.readFileSync(SchainsFunctionality, 'UTF-8')}
      }
      let schainsFunctionalityResult = await deployContract(
        "SchainsFunctionality.sol", "SchainsFunctionality",
        {
          language: 'Solidity',
          sources: schainsFunctionality,
          settings: {
            outputSelection: {
                '*': {
                    '*': [ '*' ]
                }
            }
        } },
        {
          gas: '8000000',
          'account': account,
          'arguments': ["SkaleManager", "SchainsData", file['contract_manager_address']] });
      await setContractsAddress(file['contract_manager_address'], file['contract_manager_abi'], "SchainsFunctionality", schainsFunctionalityResult.address, account);

    /*let skaleManager = {
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
                    'arguments': [file['contract_manager_address']] });
    await setContractsAddress(file['contract_manager_address'], file['contract_manager_abi'], "SkaleManager", skaleManagerResult.address, account);*/

    /*let nodesFunctionality = {
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
                    'arguments': [file['contract_manager_address']] });
    await setContractsAddress(file['contract_manager_address'], file['contract_manager_abi'], "NodesFunctionality", nodesFunctionalityResult.address, account);*/

    let jsonObject = {
        schains_functionality_address: schainsFunctionalityResult.address,
        schains_functionality_abi: schainsFunctionalityResult.abi
    }

    fs.writeFile('data/updated.json', JSON.stringify(jsonObject), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log(`Done, check updated.json file in data folder.`);
        process.exit(0);
    });
}

deploy();
