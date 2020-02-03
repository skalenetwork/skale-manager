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

    add({ contractsData: [
        { name: 'ContractManager', alias: 'ContractManager' },
        { name: 'DelegationController', alias: 'DelegationController' }
        // { name: 'DelegationPeriodManager', alias: 'DelegationPeriodManager' },
        // { name: 'DelegationRequestManager', alias: 'DelegationRequestManager' },
        // { name: 'DelegationService', alias: 'DelegationService' },
        // { name: 'Distributor', alias: 'Distributor' },
        // { name: 'SkaleBalances', alias: 'SkaleBalances' },
        // { name: 'TimeHelpers', alias: 'TimeHelpers' },
        // { name: 'TokenSaleManager', alias: 'TokenSaleManager' },
        // { name: 'TokenState', alias: 'TokenState' },
        // { name: 'ValidatorService', alias: 'ValidatorService' }
    ] });

    // Push implementation contracts to the network
    await push(options);

    await create(Object.assign({ contractAlias: 'ContractManager', methodName: 'initialize', methodArgs: [] }, options));
    const contractManager = await ContractManager.deployed();
    console.log("CM address: " + ContractManager.address);

    await create(Object.assign({ contractAlias: 'DelegationController', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    await contractManager.setContractsAddress("DelegationController", DelegationController.address).then(function(res) {
        console.log("Contract DelegationController with address", DelegationController.address, "registred in Contract Manager");
    });

    // await create(Object.assign({ contractAlias: 'DelegationPeriodManager', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("DelegationPeriodManager", DelegationPeriodManager.address).then(function(res) {
    //     console.log("Contract DelegationPeriodManager with address", DelegationPeriodManager.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'DelegationRequestManager', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("DelegationRequestManager", DelegationRequestManager.address).then(function(res) {
    //     console.log("Contract DelegationRequestManager with address", DelegationRequestManager.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'DelegationService', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("DelegationService", DelegationService.address).then(function(res) {
    //     console.log("Contract DelegationService with address", DelegationService.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'Distributor', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("Distributor", Distributor.address).then(function(res) {
    //     console.log("Contract Distributor with address", Distributor.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'SkaleBalances', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("SkaleBalances", SkaleBalances.address).then(function(res) {
    //     console.log("Contract SkaleBalances with address", SkaleBalances.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'TimeHelpers' }, options));
    // await contractManager.setContractsAddress("TimeHelpers", TimeHelpers.address).then(function(res) {
    //     console.log("Contract TimeHelpers with address", TimeHelpers.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'TokenSaleManager', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("TokenSaleManager", TokenSaleManager.address).then(function(res) {
    //     console.log("Contract TokenSaleManager with address", TokenSaleManager.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'TokenSaleManager', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("TokenSaleManager", TokenSaleManager.address).then(function(res) {
    //     console.log("Contract TokenSaleManager with address", TokenSaleManager.address, "registred in Contract Manager");
    // });

    // await create(Object.assign({ contractAlias: 'ValidatorService', methodName: 'initialize', methodArgs: [ContractManager.address] }, options));
    // await contractManager.setContractsAddress("ValidatorService", ValidatorService.address).then(function(res) {
    //     console.log("Contract ValidatorService with address", ValidatorService.address, "registred in Contract Manager");
    // });

    console.log("OLOLO");    

    // await deployer.then(async () => {
    //     console.log("Inside");
    //     console.log("---");
    //     console.log(network);
    //     console.log(accounts);
    //     console.log({ network: network, from: accounts[0] });
    //     console.log(ConfigManager);
    //     console.log("---");
    //     await ConfigManager.initNetworkConfiguration({ network: network, from: accounts[0] });
    //     console.log("-end-");
    //     try {
    //         const { network, txParams } = await ConfigManager.initNetworkConfiguration({ network: network, from: accounts[0] })
    //     } catch (e) {
    //         console.log(e);
    //     }
    //     console.log("After");
    //     // const options = { network, txParams };
    //     // console.log("Options: " + options);
                
    //     // add({ contractsData: [{ name: 'ContractManager', alias: 'ContractManager' }] });

    //     // // Push implementation contracts to the network
    //     // await push(options);

    //     // // Create an instance of MyContract, setting initial value to 42
    //     // await create(Object.assign({ contractAlias: 'ContractManager', methodName: 'initialize' }, options));
        
    //     // await create(Object.assign({ contractAlias: 'ContractManager' }, options));
    // });

    // await deployer.deploy(ContractManager, {gas: gasLimit}).then(async function(contractManagerInstance) {
    //     await deployer.deploy(SkaleToken, contractManagerInstance.address, [], {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
    //         console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ConstantsHolder, contractManagerInstance.address, {gas: gasLimit});
    //     await contractManagerInstance.setContractsAddress("Constants", ConstantsHolder.address).then(function(res) {
    //         console.log("Contract Constants with address", ConstantsHolder.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(NodesData, 5260000, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("NodesData", NodesData.address).then(function(res) {
    //         console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(NodesFunctionality, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
    //         console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(MonitorsData, "MonitorsFunctionality", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("MonitorsData", MonitorsData.address).then(function(res) {
    //         console.log("Contract Monitors Data with address", MonitorsData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(MonitorsFunctionality, "SkaleManager", "MonitorsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("MonitorsFunctionality", MonitorsFunctionality.address).then(function(res) {
    //         console.log("Contract Monitors Functionality with address", MonitorsFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsData, "SchainsFunctionalityInternal", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
    //         console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
    //         console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SchainsFunctionalityInternal, "SchainsFunctionality", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SchainsFunctionalityInternal", SchainsFunctionalityInternal.address).then(function(res) {
    //         console.log("Contract Schains FunctionalityInternal with address", SchainsFunctionalityInternal.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(Decryption, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("Decryption", Decryption.address).then(function(res) {
    //         console.log("Contract Decryption with address", Decryption.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ECDH, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ECDH", ECDH.address).then(function(res) {
    //         console.log("Contract ECDH with address", ECDH.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleDKG, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleDKG", SkaleDKG.address).then(function(res) {
    //         console.log("Contract SkaleDKG with address", SkaleDKG.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleVerifier, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleVerifier", SkaleVerifier.address).then(function(res) {
    //         console.log("Contract SkaleVerifier with address", SkaleVerifier.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ManagerData, "SkaleManager", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
    //         console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
    //         console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(Pricing, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("Pricing", Pricing.address).then(function(res) {
    //         console.log("Contract Pricing with address", Pricing.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(SkaleBalances, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("SkaleBalances", SkaleBalances.address).then(function(res) {
    //         console.log("Contract SkaleBalances with address", SkaleBalances.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationService, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationService", DelegationService.address).then(function(res) {
    //         console.log("Contract DelegationService with address", DelegationService.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationRequestManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationRequestManager", DelegationRequestManager.address).then(function(res) {
    //         console.log("Contract DelegationRequestManager with address", DelegationRequestManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationPeriodManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationPeriodManager", DelegationPeriodManager.address).then(function(res) {
    //         console.log("Contract DelegationPeriodManager with address", DelegationPeriodManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(ValidatorService, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("ValidatorService", ValidatorService.address).then(function(res) {
    //         console.log("Contract ValidatorService with address", ValidatorService.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(Distributor, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("Distributor", Distributor.address).then(function(res) {
    //         console.log("Contract Distributor with address", Distributor.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(TokenSaleManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("TokenSaleManager", TokenSaleManager.address).then(function(res) {
    //         console.log("Contract TokenSaleManager with address", TokenSaleManager.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(TokenState, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("TokenState", TokenState.address).then(function(res) {
    //         console.log("Contract TokenState with address", TokenState.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(BokkyPooBahsDateTimeLibrary, {gas: gasLimit * gas_multiplier});
    //     await deployer.link(BokkyPooBahsDateTimeLibrary, TimeHelpers);
    //     await deployer.deploy(TimeHelpers, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("TimeHelpers", TimeHelpers.address).then(function(res) {
    //         console.log("Contract TimeHelpers with address", TimeHelpers.address, "registred in Contract Manager");
    //     });
    //     await deployer.deploy(DelegationController, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
    //     await contractManagerInstance.setContractsAddress("DelegationController", DelegationController.address).then(function(res) {
    //         console.log("Contract DelegationController with address", DelegationController.address, "registred in Contract Manager");
    //         console.log();
    //     });
    
    //     //
    //     console.log('Deploy done, writing results...');
    //     let jsonObject = {
    //         skale_token_address: SkaleToken.address,
    //         skale_token_abi: SkaleToken.abi,
    //         nodes_data_address: NodesData.address,
    //         nodes_data_abi: NodesData.abi,
    //         nodes_functionality_address: NodesFunctionality.address,
    //         nodes_functionality_abi: NodesFunctionality.abi,
    //         monitors_data_address: MonitorsData.address,
    //         monitors_data_abi: MonitorsData.abi,
    //         monitors_functionality_address: MonitorsFunctionality.address,
    //         monitors_functionality_abi: MonitorsFunctionality.abi,
    //         schains_data_address: SchainsData.address,
    //         schains_data_abi: SchainsData.abi,
    //         schains_functionality_address: SchainsFunctionality.address,
    //         schains_functionality_abi: SchainsFunctionality.abi,
    //         manager_data_address: ManagerData.address,
    //         manager_data_abi: ManagerData.abi,
    //         skale_manager_address: SkaleManager.address,
    //         skale_manager_abi: SkaleManager.abi,
    //         constants_address: ConstantsHolder.address,
    //         constants_abi: ConstantsHolder.abi,
    //         decryption_address: Decryption.address,
    //         decryption_abi: Decryption.abi,
    //         skale_dkg_address: SkaleDKG.address,
    //         skale_dkg_abi: SkaleDKG.abi,
    //         skale_verifier_address: SkaleVerifier.address,
    //         skale_verifier_abi: SkaleVerifier.abi,
    //         contract_manager_address: ContractManager.address,
    //         contract_manager_abi: ContractManager.abi,
    //         pricing_address: Pricing.address,
    //         pricing_abi: Pricing.abi,
    //         skale_balances_address: SkaleBalances.address,
    //         skale_balances_abi: SkaleBalances.abi,
    //         delegation_service_address: DelegationService.address,
    //         delegation_service_abi: DelegationService.abi,
    //         delegation_request_manager_address: DelegationRequestManager.address,
    //         delegation_request_manager_abi: DelegationRequestManager.abi,
    //         delegation_period_manager_address: DelegationPeriodManager.address,
    //         delegation_period_manager_abi: DelegationPeriodManager.abi,
    //         validator_service_address: ValidatorService.address,
    //         validator_service_abi: ValidatorService.abi,
    //         distributor_address: Distributor.address,
    //         distributor_abi: Distributor.abi,
    //         token_sale_manager_address: TokenSaleManager.address,
    //         token_sale_manager_abi: TokenSaleManager.abi,
    //         token_state_address: TokenState.address,
    //         token_state_abi: TokenState.abi,
    //         time_helpers_address: TimeHelpers.address,
    //         time_helpers_abi: TimeHelpers.abi,
    //         delegation_controller_address: DelegationController.address,
    //         delegation_controller_abi: DelegationController.abi
    //     };

    //     await fsPromises.writeFile(`data/${network}.json`, JSON.stringify(jsonObject));
    //     await sleep(10000);
    //     console.log(`Done, check ${network}.json file in data folder.`);
    // });

    
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
