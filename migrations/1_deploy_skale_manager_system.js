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
    
    const options = await ConfigManager.initNetworkConfiguration({ network: networkName, from: accounts[0] });

    const contracts = [
        "ContractManager",
        "DelegationController",
        "DelegationPeriodManager",
        "DelegationRequestManager",
        "DelegationService",
        "Distributor",
        "SkaleBalances",
        "TimeHelpers",
        "TokenSaleManager",
        "TokenState",
        "ValidatorService"
    ]

    contractsData = [];
    for (const contract of contracts) {
        contractsData.push({name: contract, alias: contract});
    }    

    add({ contractsData: contractsData });

    // Push implementation contracts to the network
    await push(options);

    await create(Object.assign({ contractAlias: 'ContractManager', methodName: 'initialize', methodArgs: [] }, options));
    const contractManager = await ContractManager.deployed();    

    // deploy upgradable contracts

    for (const contract of contracts) {
        if (contract == "ContractManager") {
            console.log("CM address: " + ContractManager.address);
        } else if (contract == "TimeHelpers") {
            await create(Object.assign({ contractAlias: contract }, options));
        } else {
            await create(Object.assign({ contractAlias: contract, methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
        }
    }    

    console.log("Register contracts");

    for (const contract of contracts) {
        for (let delay = 1000; delay < 10 * 1000; delay *= 1.618)
        {
            try {
                await eval(contract).deployed();
                break;
            } catch (e) {
                console.log(e);
                console.log("Wait " + Math.round(delay / 1000) + "s to retry");
                await sleep(delay);
            }
        }
        const address = eval(contract).address;
        let registrationIsNeeded = false;
        try {
            registrationIsNeeded = address != await contractManager.getContract(contract);
        } catch (e) {
            if (e.message == "Returned error: VM Exception while processing transaction: revert Contract has not been found") {
                registrationIsNeeded = true;
            } else {
                throw e;
            }                        
        }   

        if (registrationIsNeeded) {
            await contractManager.setContractsAddress(contract, address).then(function(res) {
                console.log("Contract", contract, "with address", address, "is registered in Contract Manager");
            }); 
        }
    }  

    console.log("Done");
    
    await deployer.deploy(SkaleToken, contractManager.address, [], {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
        console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
    });
    await deployer.deploy(ConstantsHolder, contractManager.address, {gas: gasLimit});
    await contractManager.setContractsAddress("Constants", ConstantsHolder.address).then(function(res) {
        console.log("Contract Constants with address", ConstantsHolder.address, "registred in Contract Manager");
    });
    await deployer.deploy(NodesData, 5260000, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("NodesData", NodesData.address).then(function(res) {
        console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
    });
    await deployer.deploy(NodesFunctionality, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
        console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
    });
    await deployer.deploy(MonitorsData, "MonitorsFunctionality", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("MonitorsData", MonitorsData.address).then(function(res) {
        console.log("Contract Monitors Data with address", MonitorsData.address, "registred in Contract Manager");
    });
    await deployer.deploy(MonitorsFunctionality, "SkaleManager", "MonitorsData", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("MonitorsFunctionality", MonitorsFunctionality.address).then(function(res) {
        console.log("Contract Monitors Functionality with address", MonitorsFunctionality.address, "registred in Contract Manager");
    });
    await deployer.deploy(SchainsData, "SchainsFunctionalityInternal", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
        console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
    });
    await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
        console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
    });
    await deployer.deploy(SchainsFunctionalityInternal, "SchainsFunctionality", "SchainsData", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SchainsFunctionalityInternal", SchainsFunctionalityInternal.address).then(function(res) {
        console.log("Contract Schains FunctionalityInternal with address", SchainsFunctionalityInternal.address, "registred in Contract Manager");
    });
    await deployer.deploy(Decryption, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("Decryption", Decryption.address).then(function(res) {
        console.log("Contract Decryption with address", Decryption.address, "registred in Contract Manager");
    });
    await deployer.deploy(ECDH, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("ECDH", ECDH.address).then(function(res) {
        console.log("Contract ECDH with address", ECDH.address, "registred in Contract Manager");
    });
    await deployer.deploy(SkaleDKG, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SkaleDKG", SkaleDKG.address).then(function(res) {
        console.log("Contract SkaleDKG with address", SkaleDKG.address, "registred in Contract Manager");
    });
    await deployer.deploy(SkaleVerifier, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SkaleVerifier", SkaleVerifier.address).then(function(res) {
        console.log("Contract SkaleVerifier with address", SkaleVerifier.address, "registred in Contract Manager");
    });
    await deployer.deploy(ManagerData, "SkaleManager", contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
        console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
    });
    await deployer.deploy(SkaleManager, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
        console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
    });
    await deployer.deploy(Pricing, contractManager.address, {gas: gasLimit * gas_multiplier});
    await contractManager.setContractsAddress("Pricing", Pricing.address).then(function(res) {
        console.log("Contract Pricing with address", Pricing.address, "registred in Contract Manager");
    });
    
    await deployer.deploy(BokkyPooBahsDateTimeLibrary, {gas: gasLimit * gas_multiplier});
    await deployer.link(BokkyPooBahsDateTimeLibrary, TimeHelpers);        

    //
    console.log('Deploy done, writing results...');
    let jsonObject = {
        skale_token_address: SkaleToken.address,
        skale_token_abi: SkaleToken.abi,
        nodes_data_address: NodesData.address,
        nodes_data_abi: NodesData.abi,
        nodes_functionality_address: NodesFunctionality.address,
        nodes_functionality_abi: NodesFunctionality.abi,
        monitors_data_address: MonitorsData.address,
        monitors_data_abi: MonitorsData.abi,
        monitors_functionality_address: MonitorsFunctionality.address,
        monitors_functionality_abi: MonitorsFunctionality.abi,
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
        decryption_address: Decryption.address,
        decryption_abi: Decryption.abi,
        skale_dkg_address: SkaleDKG.address,
        skale_dkg_abi: SkaleDKG.abi,
        skale_verifier_address: SkaleVerifier.address,
        skale_verifier_abi: SkaleVerifier.abi,
        contract_manager_address: ContractManager.address,
        contract_manager_abi: ContractManager.abi,
        pricing_address: Pricing.address,
        pricing_abi: Pricing.abi,
        skale_balances_address: SkaleBalances.address,
        skale_balances_abi: SkaleBalances.abi,
        delegation_service_address: DelegationService.address,
        delegation_service_abi: DelegationService.abi,
        delegation_request_manager_address: DelegationRequestManager.address,
        delegation_request_manager_abi: DelegationRequestManager.abi,
        delegation_period_manager_address: DelegationPeriodManager.address,
        delegation_period_manager_abi: DelegationPeriodManager.abi,
        validator_service_address: ValidatorService.address,
        validator_service_abi: ValidatorService.abi,
        distributor_address: Distributor.address,
        distributor_abi: Distributor.abi,
        token_sale_manager_address: TokenSaleManager.address,
        token_sale_manager_abi: TokenSaleManager.abi,
        token_state_address: TokenState.address,
        token_state_abi: TokenState.abi,
        time_helpers_address: TimeHelpers.address,
        time_helpers_abi: TimeHelpers.abi,
        delegation_controller_address: DelegationController.address,
        delegation_controller_abi: DelegationController.abi
    };

    await fsPromises.writeFile(`data/${networkName}.json`, JSON.stringify(jsonObject));
    await sleep(10000);
    console.log(`Done, check ${networkName}.json file in data folder.`);
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
