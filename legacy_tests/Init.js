require('dotenv').config();
const networkName = process.env.NETWORK;
const privateKey = process.env.PRIVATE_KEY;

let networks = require("../truffle-config.js");
let currentNetwork = networks['networks'][networkName];

const LINE = '======================================';

const Web3 = require('web3');
// const PrivateKeyProvider = require("@truffle/hdwallet-provider");
// const provider = new PrivateKeyProvider(privateKey, `http://${currentNetwork['host']}:${currentNetwork['port']}`);
// const web3 = new Web3(provider);
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
//////
const mainAccount = "0x0000000000000000000000000000000000000000";

const jsonData = require(`../data/${networkName}.json`);
// const updatedData = require("../data/updated.json");
const SkaleManager = new web3.eth.Contract(jsonData['skale_manager_abi'], jsonData['skale_manager_address']);
module.exports.SkaleManager = SkaleManager;//new web3.eth.Contract(jsonData['skale_manager_abi'], jsonData['skale_manager_address']);
const SkaleToken = new web3.eth.Contract(jsonData['skale_token_abi'], jsonData['skale_token_address']);
module.exports.SkaleToken = SkaleToken;//new web3.eth.Contract(jsonData['skale_token_abi'], jsonData['skale_token_address']);
const Constants = new web3.eth.Contract(jsonData['constants_holder_abi'], jsonData['constants_holder_address']);
module.exports.Constants = Constants;//new web3.eth.Contract(jsonData['constants_abi'], jsonData['constants_address']);
const ManagerData = new web3.eth.Contract(jsonData['manager_data_abi'], jsonData['manager_data_address']);
module.exports.ManagerData = ManagerData;//new web3.eth.Contract(jsonData['manager_data_abi'], jsonData['manager_data_address']);
module.exports.Nodes = new web3.eth.Contract(jsonData['nodes_abi'], jsonData['nodes_address']);
module.exports.Schains = new web3.eth.Contract(jsonData['schains_functionality_abi'], jsonData['schains_functionality_address']);
module.exports.ValidatorsFunctionality = new web3.eth.Contract(jsonData['monitors_functionality_abi'], jsonData['monitors_functionality_address']);
module.exports.SchainsInternal = new web3.eth.Contract(jsonData['schains_data_abi'], jsonData['schains_data_address']);
module.exports.ValidatorsData = new web3.eth.Contract(jsonData['monitors_data_abi'], jsonData['monitors_data_address']);
module.exports.ContractManager = new web3.eth.Contract(jsonData['contract_manager_abi'], jsonData['contract_manager_address']);
module.exports.DelegationService = new web3.eth.Contract(jsonData['delegation_service_abi'], jsonData['delegation_service_address']);
module.exports.ValidatorService = new web3.eth.Contract(jsonData['validator_service_abi'], jsonData['validator_service_address']);
module.exports.TokenState = new web3.eth.Contract(jsonData['token_state_abi'], jsonData['token_state_address']);
module.exports.web3 = web3;
module.exports.mainAccount = mainAccount;
module.exports.jsonData = jsonData;
module.exports.privateKey
