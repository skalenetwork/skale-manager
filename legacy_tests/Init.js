require('dotenv').config();
const networkName = process.env.NETWORK;
const privateKey = process.env.PRIVATE_KEY;
const endpoint = process.env.ENDPOINT;

// let networks = require("../truffle-config.js");
// let currentNetwork = networks['networks'][networkName];

const LINE = '======================================';
const Web3 = require('web3');
const PrivateKeyProvider = require("@truffle/hdwallet-provider");
const provider = new PrivateKeyProvider(privateKey, endpoint);
const web3 = new Web3(provider);
// const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

const mainAccount = process.env.ACCOUNT;

const jsonData = require(`../data/${networkName}.json`);
// const updatedData = require("../data/updated.json");
module.exports.SkaleManager = new web3.eth.Contract(jsonData['skale_manager_abi'], jsonData['skale_manager_address']);
module.exports.SkaleToken = new web3.eth.Contract(jsonData['skale_token_abi'], jsonData['skale_token_address']);
module.exports.Constants = new web3.eth.Contract(jsonData['constants_holder_abi'], jsonData['constants_holder_address']);
module.exports.Nodes = new web3.eth.Contract(jsonData['nodes_abi'], jsonData['nodes_address']);
module.exports.Schains = new web3.eth.Contract(jsonData['schains_abi'], jsonData['schains_address']);
module.exports.SchainsInternal = new web3.eth.Contract(jsonData['schains_internal_abi'], jsonData['schains_internal_address']);
module.exports.ContractManager = new web3.eth.Contract(jsonData['contract_manager_abi'], jsonData['contract_manager_address']);
module.exports.ValidatorService = new web3.eth.Contract(jsonData['validator_service_abi'], jsonData['validator_service_address']);
module.exports.TokenState = new web3.eth.Contract(jsonData['token_state_abi'], jsonData['token_state_address']);
module.exports.SlashingTable = new web3.eth.Contract(jsonData['slashing_table_abi'], jsonData['slashing_table_address']);
module.exports.Punisher = new web3.eth.Contract(jsonData['punisher_abi'], jsonData['punisher_address']);
module.exports.web3 = web3;
module.exports.mainAccount = mainAccount;
module.exports.jsonData = jsonData;
module.exports.privateKey = privateKey;
module.exports.network = networkName;
