require('dotenv').config();
let fs = require("fs");
let HDWalletProvider = require('truffle-hdwallet-provider');
let Web3 = require('web3');

let privateKey = process.env.PRIVATE_KEY;

let dataJson = require("../data/SKALE_private_testnet.json");

let web3 = new Web3(new HDWalletProvider(privateKey, "http://134.209.56.46:1919"));
let contractManagerInstance = new web3.eth.Contract(dataJson.contract_manager_abi, dataJson.contract_manager_address);

//let SkaleToken = artifacts.require('./SkaleToken.sol');
let SkaleManager = artifacts.require('./SkaleManager.sol');
let ManagerData = artifacts.require('./ManagerData.sol');
let NodesData = artifacts.require('./NodesData.sol');
let NodesFunctionality = artifacts.require('./NodesFunctionality.sol');
let ValidatorsData = artifacts.require('./ValidatorsData.sol');
let ValidatorsFunctionality = artifacts.require('./ValidatorsFunctionality.sol');
let SchainsData = artifacts.require('./SchainsData.sol');
let SchainsFunctionality = artifacts.require('./SchainsFunctionality.sol');
let SchainsFunctionality1 = artifacts.require('./SchainsFunctionality1.sol');
//let ContractManager = artifacts.require('./ContractManager.sol');
let ConstantsHolder = artifacts.require('./ConstantsHolder.sol');

let ContractManager = {"address": "0xBa56925cE90818f0108CEa72288b1C484a6a4364", "abi": dataJson.contract_manager_abi};
let SkaleToken = {"address": dataJson.skale_token_address, "abi": dataJson.skale_token_abi};

async function deploy(deployer, network) {
    //await deployer.deploy(ContractManager, {gas: 8000000, overwrite: false}).then(async function(contractManagerInstance) {
        //await deployer.deploy(SkaleToken, contractManagerInstance.address, {gas: 8000000});
        /*await contractManagerInstance.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
            console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
        });*/
        await deployer.deploy(ConstantsHolder, ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("Constants", ConstantsHolder.address).then(function(res) {
        //     console.log("Contract Constants with address", ConstantsHolder.address, "registred in Contract Manager");
        // });
        await deployer.deploy(NodesData, 5260000, ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("NodesData", NodesData.address).then(function(res) {
        //     console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
        // });
        await deployer.deploy(NodesFunctionality, ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
        //     console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
        // });
        await deployer.deploy(ValidatorsData, "ValidatorsFunctionality", ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("ValidatorsData", ValidatorsData.address).then(function(res) {
        //     console.log("Contract Validators Data with address", ValidatorsData.address, "registred in Contract Manager");
        // });
        await deployer.deploy(ValidatorsFunctionality, "SkaleManager", "ValidatorsData", ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("ValidatorsFunctionality", ValidatorsFunctionality.address).then(function(res) {
        //     console.log("Contract Validators Functionality with address", ValidatorsFunctionality.address, "registred in Contract Manager");
        // });
        await deployer.deploy(SchainsData, "SchainsFunctionality1", ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
        //     console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
        // });
        await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", ContractManager.address, {gas: 3000000});
        // await contractManagerInstance.methods.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
        //     console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
        // });
        await deployer.deploy(SchainsFunctionality1, "SchainsFunctionality", "SchainsData", ContractManager.address, {gas: 7000000});
        // await contractManagerInstance.methods.setContractsAddress("SchainsFunctionality1", SchainsFunctionality1.address).then(function(res) {
        //     console.log("Contract Schains Functionality1 with address", SchainsFunctionality1.address, "registred in Contract Manager");
        // });
        await deployer.deploy(ManagerData, "SkaleManager", ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
        //     console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
        // });
        await deployer.deploy(SkaleManager, ContractManager.address, {gas: 8000000});
        // await contractManagerInstance.methods.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
        //     console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
        //     console.log();
        // });
    
        //
        console.log('Deploy done, writing results...');
        let jsonObject = {
            skale_token_address: SkaleToken.address,
            skale_token_abi: SkaleToken.abi,
            nodes_data_address: NodesData.address,
            nodes_data_abi: NodesData.abi,
            nodes_functionality_address: NodesFunctionality.address,
            nodes_functionality_abi: NodesFunctionality.abi,
            validators_data_address: ValidatorsData.address,
            validators_data_abi: ValidatorsData.abi,
            validators_functionality_address: ValidatorsFunctionality.address,
            validators_functionality_abi: ValidatorsFunctionality.abi,
            schains_data_address: SchainsData.address,
            schains_data_abi: SchainsData.abi,
            schains_functionality_address: SchainsFunctionality.address,
            schains_functionality_abi: SchainsFunctionality.abi,
            manager_data_address: ManagerData.address,
            manager_data_abi: ManagerData.abi,
            skale_manager_address: SkaleManager.address,
            skale_manager_abi: SkaleManager.abi,
            constants_address: ConstantsHolder.address,
            constants_abi: ConstantsHolder.abi,
            contract_manager_address: ContractManager.address,
            contract_manager_abi: ContractManager.abi
        };

        await fs.writeFile(`data/${network}.json`, JSON.stringify(jsonObject));
        await sleep(10000);
        console.log(`Done, check ${network}.json file in data folder.`);
    //});

    
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = deploy;