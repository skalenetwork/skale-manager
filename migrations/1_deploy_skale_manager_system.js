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

let SkaleToken = artifacts.require('./SkaleToken.sol');

let gasLimit = 6900000;

let erc1820Contract = erc1820Params.contractAddress;
let erc1820Sender = erc1820Params.senderAddress;
let erc1820Bytecode = erc1820Params.bytecode;
let erc1820Amount = "80000000000000000";

async function deploy(deployer, networkName, accounts) {
    if (configFile.networks[networkName].host !== "" && configFile.networks[networkName].host !== undefined && configFile.networks[networkName].port !== "" && configFile.networks[networkName].port !== undefined) {
        let web3 = new Web3(new Web3.providers.HttpProvider("http://" + configFile.networks[networkName].host + ":" + configFile.networks[networkName].port));
        if (await web3.eth.getCode(erc1820Contract) == "0x") {
            console.log("Deploying ERC1820 contract!")
            await web3.eth.sendTransaction({ from: configFile.networks[networkName].from, to: erc1820Sender, value: erc1820Amount});
            console.log("Account " + erc1820Sender + " replenished with " + erc1820Amount + " wei");
            await web3.eth.sendSignedTransaction(erc1820Bytecode);
            console.log("ERC1820 contract deployed!");
        } else {
            console.log("ERC1820 contract has already deployed!");
        }
        console.log("Starting SkaleManager system deploying...");
    } else if (configFile.networks[networkName].provider !== "" && configFile.networks[networkName].provider !== undefined) {
        let web3 = new Web3(configFile.networks[networkName].provider());
        if (await web3.eth.getCode(erc1820Contract) == "0x") {
            console.log("Deploying ERC1820 contract!")
            const addr = (await web3.eth.accounts.privateKeyToAccount("0x" + privateKey)).address;
            console.log("Address " + addr + " !!!");
            const nonceNumber = await web3.eth.getTransactionCount(addr);
            const tx = {
                nonce: nonceNumber,
                from: addr,
                to: erc1820Sender,
                gas: "21000",
                value: erc1820Amount
            };
            const signedTx = await web3.eth.signTransaction(tx, "0x" + privateKey);
            await web3.eth.sendSignedTransaction(signedTx.raw || signedTx.rawTransaction);
            console.log("Account " + erc1820Sender + " replenished with " + erc1820Amount + " wei");
            await web3.eth.sendSignedTransaction(erc1820Bytecode);
            console.log("ERC1820 contract deployed!");
        } else {
            console.log("ERC1820 contract has already deployed!");
        }
        console.log("Starting SkaleManager system deploying...");
    }    
    
    const deployAccount = accounts[0];
    const options = await ConfigManager.initNetworkConfiguration({ network: networkName, from: deployAccount });

    const contracts = [
        "ContractManager", // must be in first position

        "DelegationController",
        "DelegationPeriodManager",
        "DelegationRequestManager",
        "DelegationService",
        "Distributor",
        "SkaleBalances",
        "TimeHelpers",
        "TokenSaleManager",
        "TokenState",
        "ValidatorService",

        "ConstantsHolder",
        "NodesData",
        "NodesFunctionality",
        "MonitorsData",
        "MonitorsFunctionality",
        "SchainsData",
        "SchainsFunctionality",
        "SchainsFunctionalityInternal",
        "Decryption",
        "ECDH",
        "SkaleDKG",
        "SkaleVerifier",
        "ManagerData",
        "SkaleManager",
        "Pricing"
    ]

    contractsData = [];
    for (const contract of contracts) {
        contractsData.push({name: contract, alias: contract});
    }    

    add({ contractsData: contractsData });

    // Push implementation contracts to the network
    await push(options);

    // deploy upgradable contracts

    const deployed = new Map();
    let contractManager;
    for (const contractName of contracts) {
        let contract;
        if (contractName == "ContractManager") {
            contract = await create(Object.assign({ contractAlias: contractName, methodName: 'initialize', methodArgs: [] }, options));
            contractManager = contract;
            console.log("contractManager address:", contract.address);
        } else if (["TimeHelpers", "Decryption", "ECDH"].includes(contractName)) {
            contract = await create(Object.assign({ contractAlias: contractName }, options));
        } else if (contractName == "NodesData") {
            contract = await create(Object.assign({ contractAlias: contractName, methodName: 'initialize', methodArgs: [5260000, contractManager.address] }, options));
        } else {
            contract = await create(Object.assign({ contractAlias: contractName, methodName: 'initialize', methodArgs: [contractManager.address] }, options));
        }
        deployed.set(contractName, contract);
    }    

    console.log("Register contracts");
    
    for (const contract of contracts) {
        const address = deployed.get(contract).address;
        await contractManager.methods.setContractsAddress(contract, address).send({from: deployAccount}).then(function(res) {
            console.log("Contract", contract, "with address", address, "is registered in Contract Manager");
        });
    }  

    console.log("Done");
    
    await deployer.deploy(SkaleToken, contractManager.address, [], {gas: gasLimit * gas_multiplier});
    await contractManager.methods.setContractsAddress("SkaleToken", SkaleToken.address).send({from: deployAccount}).then(function(res) {
        console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
    });
    
    console.log('Deploy done, writing results...');

    let jsonObject = {
        skale_token_address: SkaleToken.address,
        skale_token_abi: SkaleToken.abi
    };
    for (const contractName of contracts) {
        propertyName = contractName.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
        jsonObject[propertyName + "_address"] = deployed.get(contractName).address;
        jsonObject[propertyName + "_abi"] = eval(contractName).abi;
    }

    await fsPromises.writeFile(`data/${networkName}.json`, JSON.stringify(jsonObject));
    await sleep(10000);
    console.log(`Done, check ${networkName}.json file in data folder.`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = deploy;
