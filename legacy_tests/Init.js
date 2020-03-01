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
const mainAccount = "0x817690a9cd30c48b529fef7ac813eaa4196546f6";

const jsonData = require(`../data/${networkName}.json`);
// const updatedData = require("../data/updated.json");
console.log("OOOOOK");
const SkaleManager = new web3.eth.Contract(jsonData['skale_manager_abi'], jsonData['skale_manager_address']);
console.log("OOOOOoooK");
module.exports.SkaleManager = SkaleManager;//new web3.eth.Contract(jsonData['skale_manager_abi'], jsonData['skale_manager_address']);
console.log("OOOOOoooOIOOOOOK");
const SkaleToken = new web3.eth.Contract(jsonData['skale_token_abi'], jsonData['skale_token_address']);
module.exports.SkaleToken = SkaleToken;//new web3.eth.Contract(jsonData['skale_token_abi'], jsonData['skale_token_address']);
const NodesFunctionality = new web3.eth.Contract(jsonData['nodes_functionality_abi'], jsonData['nodes_functionality_address']);
module.exports.NodesFunctionality = NodesFunctionality;//new web3.eth.Contract(jsonData['nodes_functionality_abi'], jsonData['nodes_functionality_address']);
const Constants = new web3.eth.Contract(jsonData['constants_holder_abi'], jsonData['constants_holder_address']);
module.exports.Constants = Constants;//new web3.eth.Contract(jsonData['constants_abi'], jsonData['constants_address']);
const ManagerData = new web3.eth.Contract(jsonData['manager_data_abi'], jsonData['manager_data_address']);
module.exports.ManagerData = ManagerData;//new web3.eth.Contract(jsonData['manager_data_abi'], jsonData['manager_data_address']);
module.exports.NodesData = new web3.eth.Contract(jsonData['nodes_data_abi'], jsonData['nodes_data_address']);
module.exports.SchainsFunctionality = new web3.eth.Contract(jsonData['schains_functionality_abi'], jsonData['schains_functionality_address']);
module.exports.ValidatorsFunctionality = new web3.eth.Contract(jsonData['monitors_functionality_abi'], jsonData['monitors_functionality_address']);
module.exports.SchainsData = new web3.eth.Contract(jsonData['schains_data_abi'], jsonData['schains_data_address']);
module.exports.ValidatorsData = new web3.eth.Contract(jsonData['monitors_data_abi'], jsonData['monitors_data_address']);
module.exports.ContractManager = new web3.eth.Contract(jsonData['contract_manager_abi'], jsonData['contract_manager_address']);
module.exports.DelegationService = new web3.eth.Contract(jsonData['delegation_service_abi'], jsonData['delegation_service_address']);
module.exports.ValidatorService = new web3.eth.Contract(jsonData['validator_service_abi'], jsonData['validator_service_address']);
module.exports.web3 = web3;
module.exports.mainAccount = mainAccount;
module.exports.jsonData = jsonData;
module.exports.privateKey
