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
let ContractManager = artifacts.require('./ContractManager.sol');
let Constants = artifacts.require('./Constants.sol');

async function deploy(deployer) {
    await deployer.deploy(ContractManager, {gas: 8000000}).then(async function(inst) {
        await deployer.deploy(SkaleToken, inst.address, {gas: 8000000});
        await inst.setContractsAddress("SkaleToken", SkaleToken.address);
        await deployer.deploy(Constants, inst.address, {gas: 8000000});
        await inst.setContractsAddress("Constants", Constants.address);
        await deployer.deploy(NodesData, 5260000, inst.address, {gas: 8000000});
        await inst.setContractsAddress("NodesData", NodesData.address);
        await deployer.deploy(NodesFunctionality, inst.address, {gas: 8000000});
        await inst.setContractsAddress("NodesFunctionality", NodesFunctionality.address);
        await deployer.deploy(ValidatorsData, "ValidatorsFunctionality", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ValidatorsData", ValidatorsData.address);
        await deployer.deploy(ValidatorsFunctionality, "SkaleManager", "ValidatorsData", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ValidatorsFunctionality", ValidatorsFunctionality.address);
        await deployer.deploy(SchainsData, "SchainsFunctionality", inst.address, {gas: 8000000});
        await inst.setContractsAddress("SchainsData", SchainsData.address);
        await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", inst.address, {gas: 100000000});
        await inst.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address);
        await deployer.deploy(ManagerData, "SkaleManager", inst.address, {gas: 8000000});
        await inst.setContractsAddress("ManagerData", ManagerData.address);
        await deployer.deploy(SkaleManager, inst.address, {gas: 8000000});
        await inst.setContractsAddress("SkaleManager", SkaleManager.address);
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

    fs.writeFile(`data/${networkName}.json`, JSON.stringify(jsonObject), function (err) {
        if (err) {
        return console.log(err);
        }
        console.log(`Done, check ${networkName}.json file in data folder.`);
        process.exit(0);
    });
}

module.exports = deploy;