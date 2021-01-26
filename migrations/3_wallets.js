let fs = require("fs");
const fsPromises = fs.promises;

let Web3 = require('web3');
const Tx = require('ethereumjs-tx');


const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;


let production;

if (process.env.PRODUCTION === "true") {
    production = true;
} else if (process.env.PRODUCTION === "false") {
    production = false;
} else {
    console.log("Recheck Production variable in .env");
    console.log("Set Production as false");
    production = false;
}



async function deploy(deployer, networkName, accounts) {
    const deployAccount = accounts[0];
    const options = await ConfigManager.initNetworkConfiguration({ network: networkName, from: deployAccount });

    const contracts = [
        "Wallets"
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

    
    if (!production) {
        console.log("Register contracts");
        for (const contract of contracts) {
            const address = deployed.get(contract).address;
            await ContractManager.methods.setContractsAddress("Wallets", address).send({from: deployAccount}).then(function(res) {
                console.log("Contract", contract, "with address", address, "is registered in Contract Manager");
            });
        }
    }
    
    console.log('Deploy done, writing results...');

    jsonData["wallets_address"] = deployed.get("Wallets").address;
    jsonData["wallets_abi"] = artifacts.require("./Wallets").abi;

    await fsPromises.writeFile(`data/${networkName}.json`, JSON.stringify(jsonData));
    console.log(`Done, check ${networkName}.json file in data folder.`);
}

module.exports = deploy;
