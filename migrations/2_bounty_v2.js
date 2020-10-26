let fs = require("fs");
const fsPromises = fs.promises;

let Web3 = require('web3');
const Tx = require('ethereumjs-tx');

let configFile = require('../truffle-config.js');
let erc1820Params = require('../scripts/erc1820.json');

const gasMultiplierParameter = 'gas_multiplier';
const argv = require('minimist')(process.argv.slice(2), {string: [gasMultiplierParameter]});
const gas_multiplier = argv[gasMultiplierParameter] === undefined ? 1 : Number(argv[gasMultiplierParameter]);

const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;

let privateKey = process.env.PRIVATE_KEY;


let gasLimit = 8000000;



async function deploy(deployer, networkName, accounts) {
    const deployAccount = accounts[0];
    const options = await ConfigManager.initNetworkConfiguration({ network: networkName, from: deployAccount });

    const contracts = [
        "BountyV2"
    ]

    contractsData = [];
    for (const contract of contracts) {
        contractsData.push({name: contract, alias: contract});
    }    

    add({ contractsData: contractsData });

    // Push implementation contracts to the network
    await push(options);

    // deploy upgradable contracts

    const jsonData = require(`../data/${networkName}.json`);
    const ContractManager = new web3.eth.Contract(jsonData['contract_manager_abi'], jsonData['contract_manager_address']);
    
    const deployed = new Map();
    for (const contractName of contracts) {
        let contract = await create(Object.assign({ contractAlias: contractName, methodName: 'initialize', methodArgs: [jsonData['contract_manager_address']] }, options));
        deployed.set(contractName, contract);
    }

    console.log("Register contracts");

    for (const contract of contracts) {
        const address = deployed.get(contract).address;
        await ContractManager.methods.setContractsAddress("Bounty", address).send({from: deployAccount}).then(function(res) {
            console.log("Contract", contract, "with address", address, "is registered in Contract Manager");
        });
    }
    
    console.log('Deploy done, writing results...');

    jsonData["bounty_address"] = deployed.get("BountyV2").address;
    jsonData["bounty_abi"] = artifacts.require("./" + "BountyV2").abi;

    await fsPromises.writeFile(`data/${networkName}.json`, JSON.stringify(jsonData));
    console.log(`Done, check ${networkName}.json file in data folder.`);
}

module.exports = deploy;
