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
let SkaleManager = artifacts.require('./SkaleManager.sol');
let ManagerData = artifacts.require('./ManagerData.sol');
let NodesData = artifacts.require('./NodesData.sol');
let NodesFunctionality = artifacts.require('./NodesFunctionality.sol');
let MonitorsData = artifacts.require('./MonitorsData.sol');
let MonitorsFunctionality = artifacts.require('./MonitorsFunctionality.sol');
let SchainsData = artifacts.require('./SchainsData.sol');
let SchainsFunctionality = artifacts.require('./SchainsFunctionality.sol');
let SchainsFunctionalityInternal = artifacts.require('./SchainsFunctionalityInternal.sol');
let ContractManager = artifacts.require('./ContractManager.sol');
let ConstantsHolder = artifacts.require('./ConstantsHolder.sol');
let SkaleDKG = artifacts.require('./SkaleDKG.sol');
let SkaleVerifier = artifacts.require('./SkaleVerifier.sol');
let Decryption = artifacts.require('./Decryption.sol');
let ECDH = artifacts.require('./ECDH.sol');
let Pricing = artifacts.require('./Pricing.sol');
let SkaleBalances = artifacts.require('./SkaleBalances.sol');
let DelegationService = artifacts.require('./DelegationService.sol');
let DelegationRequestManager = artifacts.require('./DelegationRequestManager.sol');
let DelegationPeriodManager = artifacts.require('./DelegationPeriodManager.sol');
let ValidatorService = artifacts.require('./ValidatorService.sol');
let DelegationController = artifacts.require('./DelegationController.sol');
let Distributor = artifacts.require('./Distributor.sol');
let TokenSaleManager = artifacts.require('./TokenSaleManager.sol');
let TokenState = artifacts.require('./TokenState.sol');
let TimeHelpers = artifacts.require('./TimeHelpers.sol');
let BokkyPooBahsDateTimeLibrary = artifacts.require('./BokkyPooBahsDateTimeLibrary.sol');

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
        "ManagerData"
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
    
    
    // await deployer.deploy(SkaleManager, contractManager.address, {gas: gasLimit * gas_multiplier});
    // await contractManager.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
    //     console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
    // });
    // await deployer.deploy(Pricing, contractManager.address, {gas: gasLimit * gas_multiplier});
    // await contractManager.setContractsAddress("Pricing", Pricing.address).then(function(res) {
    //     console.log("Contract Pricing with address", Pricing.address, "registred in Contract Manager");
    // });
    
    // await deployer.deploy(BokkyPooBahsDateTimeLibrary, {gas: gasLimit * gas_multiplier});
    // await deployer.link(BokkyPooBahsDateTimeLibrary, TimeHelpers);        

    // //
    // console.log('Deploy done, writing results...');
    // let jsonObject = {
    //     skale_token_address: SkaleToken.address,
    //     skale_token_abi: SkaleToken.abi,
    //     nodes_data_address: NodesData.address,
    //     nodes_data_abi: NodesData.abi,
    //     nodes_functionality_address: NodesFunctionality.address,
    //     nodes_functionality_abi: NodesFunctionality.abi,
    //     monitors_data_address: MonitorsData.address,
    //     monitors_data_abi: MonitorsData.abi,
    //     monitors_functionality_address: MonitorsFunctionality.address,
    //     monitors_functionality_abi: MonitorsFunctionality.abi,
    //     schains_data_address: SchainsData.address,
    //     schains_data_abi: SchainsData.abi,
    //     schains_functionality_address: SchainsFunctionality.address,
    //     schains_functionality_abi: SchainsFunctionality.abi,
    //     manager_data_address: ManagerData.address,
    //     manager_data_abi: ManagerData.abi,
    //     skale_manager_address: SkaleManager.address,
    //     skale_manager_abi: SkaleManager.abi,
    //     constants_address: ConstantsHolder.address,
    //     constants_abi: ConstantsHolder.abi,
    //     decryption_address: Decryption.address,
    //     decryption_abi: Decryption.abi,
    //     skale_dkg_address: SkaleDKG.address,
    //     skale_dkg_abi: SkaleDKG.abi,
    //     skale_verifier_address: SkaleVerifier.address,
    //     skale_verifier_abi: SkaleVerifier.abi,
    //     contract_manager_address: ContractManager.address,
    //     contract_manager_abi: ContractManager.abi,
    //     pricing_address: Pricing.address,
    //     pricing_abi: Pricing.abi,
    //     skale_balances_address: SkaleBalances.address,
    //     skale_balances_abi: SkaleBalances.abi,
    //     delegation_service_address: DelegationService.address,
    //     delegation_service_abi: DelegationService.abi,
    //     delegation_request_manager_address: DelegationRequestManager.address,
    //     delegation_request_manager_abi: DelegationRequestManager.abi,
    //     delegation_period_manager_address: DelegationPeriodManager.address,
    //     delegation_period_manager_abi: DelegationPeriodManager.abi,
    //     validator_service_address: ValidatorService.address,
    //     validator_service_abi: ValidatorService.abi,
    //     distributor_address: Distributor.address,
    //     distributor_abi: Distributor.abi,
    //     token_sale_manager_address: TokenSaleManager.address,
    //     token_sale_manager_abi: TokenSaleManager.abi,
    //     token_state_address: TokenState.address,
    //     token_state_abi: TokenState.abi,
    //     time_helpers_address: TimeHelpers.address,
    //     time_helpers_abi: TimeHelpers.abi,
    //     delegation_controller_address: DelegationController.address,
    //     delegation_controller_abi: DelegationController.abi
    // };

    // await fsPromises.writeFile(`data/${networkName}.json`, JSON.stringify(jsonObject));
    // await sleep(10000);
    // console.log(`Done, check ${networkName}.json file in data folder.`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTransaction(web3Inst, account, privateKey, receiverContract) {
    await web3Inst.eth.getTransactionCount(account).then(nonce => {
        const rawTx = {
            from: account,
            nonce: "0x" + nonce.toString(16),
            to: receiverContract,
            gasPrice: 1000000000,
            gas: 8000000,
            value: "0xDE0B6B3A7640000"
        };

        const tx = new Tx(rawTx);
        tx.sign(privateKey);
        const serializedTx = tx.serialize();
        web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', receipt => {
            console.log(receipt);
        });
    });
}

module.exports = deploy;
