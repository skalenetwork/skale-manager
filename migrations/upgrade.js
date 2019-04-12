const fs = require("fs");
const path = require("path");
const solc = require("solc");

let SkaleToken = path.resolve(__dirname, '../upgradeableContracts', 'SkaleToken.sol');
let SkaleManager = path.resolve(__dirname, '../upgradeableContracts', 'SkaleManager.sol');
let ManagerData = path.resolve(__dirname, '../upgradeableContracts', 'ManagerData.sol');
let NodesData = path.resolve(__dirname, '../upgradeableContracts', 'NodesData.sol');
let NodesFunctionality = path.resolve(__dirname, '../upgradeableContracts', 'NodesFunctionality.sol');
let ValidatorsData = path.resolve(__dirname, '../upgradeableContracts', 'ValidatorsData.sol');
let ValidatorsFunctionality = path.resolve(__dirname, '../upgradeableContracts', 'ValidatorsFunctionality.sol');
let SchainsData = path.resolve(__dirname, '../upgradeableContracts', 'SchainsData.sol');
let SchainsFunctionality = path.resolve(__dirname, '../upgradeableContracts', 'SchainsFunctionality.sol');
let ContractManager = path.resolve(__dirname, '../upgradeableContracts', 'ContractManager.sol');
let Ownable = path.resolve(__dirname, '../upgradeableContracts', 'Ownable.sol');
let Constants = path.resolve(__dirname, '../upgradeableContracts', 'Constants.sol');
let StandardToken = path.resolve(__dirname, '../upgradeableContracts', 'StandardToken.sol');
let Token = path.resolve(__dirname, '../upgradeableContracts', 'Token.sol');
let ContractReceiver = path.resolve(__dirname, '../upgradeableContracts', 'ContractReceiver.sol');
let Permissions = path.resolve(__dirname, '../upgradeableContracts', 'Permissions.sol');
//let Authorizable = path.resolve(__dirname, '../contracts', 'Authorizable.sol');
let GroupsData = path.resolve(__dirname, '../upgradeableContracts', 'GroupsData.sol');
let GroupsFunctionality = path.resolve(__dirname, '../upgradeableContracts', 'GroupsFunctionality.sol');

const networkName = process.env.NETWORK;
const privateKey =  process.env.ETH_PRIVATE_KEY;

let networks = require("../truffle.js");
let file = require("../data/local.json");
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
    }
}

async function deploy() {
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
                    'arguments': ["SkaleManager", "ValidatorsData", file['contract_manager_address']] });
    await setContractsAddress(file['contract_manager_address'], file['contract_manager_abi'], "ValidatorsFunctionality", validatorsFunctionalityResult.address, account);

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
        validators_functionality_address: validatorsFunctionalityResult.address,
        validators_functionality_abi: validatorsFunctionalityResult.abi
    }

    fs.writeFile('data/updated.json', JSON.stringify(jsonObject), function (err) {
        if (err) {
            return console.log(err);
        }
        console.log(`Done, check ${networkName}.json file in data folder.`);
        process.exit(0);
    });
}

deploy();
