let fs = require("fs");

let SkaleToken = artifacts.require('./SkaleToken.sol');
let SkaleManager = artifacts.require('./SkaleManager.sol');
let ManagerData = artifacts.require('./ManagerData.sol');
let NodesData = artifacts.require('./NodesData.sol');
let NodesFunctionality = artifacts.require('./NodesFunctionality.sol');
let ValidatorsData = artifacts.require('./ValidatorsData.sol');
let ValidatorsFunctionality = artifacts.require('./ValidatorsFunctionality.sol');
let SchainsData = artifacts.require('./SchainsData.sol');
let SchainsFunctionality = artifacts.require('./SchainsFunctionality.sol');
let SchainsFunctionality1 = artifacts.require('./SchainsFunctionality1.sol');
let ContractManager = artifacts.require('./ContractManager.sol');
let Constants = artifacts.require('./Constants.sol');

async function deploy(deployer, network) {
    await deployer.deploy(ContractManager, {gas: 8000000}).then(async function(inst) {
        await deployer.deploy(SkaleToken, inst.address, {gas: 8000000});
        await inst.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
            console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
        });
        await deployer.deploy(Constants, inst.address, {gas: 8000000});
        await inst.setContractsAddress("Constants", Constants.address).then(function(res) {
            console.log("Contract Constants with address", Constants.address, "registred in Contract Manager");
        });
        await deployer.deploy(NodesData, 5260000, inst.address, {gas: 8000000});
        await inst.setContractsAddress("NodesData", NodesData.address).then(function(res) {
            console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
        });
        await deployer.deploy(NodesFunctionality, inst.address, {gas: 8000000});
        await inst.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
            console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(ValidatorsData, "ValidatorsFunctionality", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ValidatorsData", ValidatorsData.address).then(function(res) {
            console.log("Contract Validators Data with address", ValidatorsData.address, "registred in Contract Manager");
        });
        await deployer.deploy(ValidatorsFunctionality, "SkaleManager", "ValidatorsData", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ValidatorsFunctionality", ValidatorsFunctionality.address).then(function(res) {
            console.log("Contract Validators Functionality with address", ValidatorsFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsData, "SchainsFunctionality1", inst.address, {gas: 8000000});
        await inst.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
            console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", inst.address, {gas: 100000000});
        await inst.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
            console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsFunctionality1, "SchainsFunctionality", "SchainsData", inst.address, {gas: 100000000});
        await inst.setContractsAddress("SchainsFunctionality1", SchainsFunctionality1.address).then(function(res) {
            console.log("Contract Schains Functionality1 with address", SchainsFunctionality1.address, "registred in Contract Manager");
        });
        await deployer.deploy(ManagerData, "SkaleManager", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
            console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
        });
        await deployer.deploy(SkaleManager, inst.address, {gas: 8000000});
        await inst.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
            console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
            console.log();
        });
    });

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
        constants_address: Constants.address,
        constants_abi: Constants.abi,
        contract_manager_address: ContractManager.address,
        contract_manager_abi: ContractManager.abi
    };

    fs.writeFile(`data/${network}.json`, JSON.stringify(jsonObject), function (err) {
        if (err) {
        return console.log(err);
        }
        console.log(`Done, check ${network}.json file in data folder.`);
        process.exit(0);
    });
}

module.exports = deploy;