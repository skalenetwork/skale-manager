let fs = require("fs");
const fsPromises = fs.promises;

let Web3 = require('web3');
const Tx = require('ethereumjs-tx');

let configFile = require('../truffle-config.js');
let erc1820Params = require('../scripts/erc1820.json');

const gasMultiplierParameter = 'gas_multiplier';
const argv = require('minimist')(process.argv.slice(2), {string: [gasMultiplierParameter]});
const gas_multiplier = argv[gasMultiplierParameter] === undefined ? 1 : Number(argv[gasMultiplierParameter]);

let privateKey = process.env.PRIVATE_KEY;

let SkaleToken = artifacts.require('./SkaleToken.sol');
let SkaleManager = artifacts.require('./SkaleManager.sol');
let ManagerData = artifacts.require('./ManagerData.sol');
let NodesData = artifacts.require('./NodesData.sol');
let NodesFunctionality = artifacts.require('./NodesFunctionality.sol');
let ValidatorsData = artifacts.require('./ValidatorsData.sol');
let ValidatorsFunctionality = artifacts.require('./ValidatorsFunctionality.sol');
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
let StringUtils = artifacts.require('./StringUtils.sol');

let gasLimit = 6900000;

let erc1820Contract = erc1820Params.contractAddress;
let erc1820Sender = erc1820Params.senderAddress;
let erc1820Bytecode = erc1820Params.bytecode;
let erc1820Amount = "80000000000000000";

async function deploy(deployer, network) {
    if (configFile.networks[network].host !== "" && configFile.networks[network].host !== undefined && configFile.networks[network].port !== "" && configFile.networks[network].port !== undefined) {
        let web3 = new Web3(new Web3.providers.HttpProvider("http://" + configFile.networks[network].host + ":" + configFile.networks[network].port));
        if (await web3.eth.getCode(erc1820Contract) == "0x") {
            console.log("Deploying ERC1820 contract!")
            await web3.eth.sendTransaction({ from: configFile.networks[network].from, to: erc1820Sender, value: erc1820Amount});
            console.log("Account " + erc1820Sender + " replenished with " + erc1820Amount + " wei");
            await web3.eth.sendSignedTransaction(erc1820Bytecode);
            console.log("ERC1820 contract deployed!");
        } else {
            console.log("ERC1820 contract has already deployed!");
        }
        console.log("Starting SkaleManager system deploying...");
    } else if (configFile.networks[network].provider !== "" && configFile.networks[network].provider !== undefined) {
        let web3 = new Web3(configFile.networks[network].provider());
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
    await deployer.deploy(ContractManager, {gas: gasLimit}).then(async function(contractManagerInstance) {
        await deployer.deploy(SkaleToken, contractManagerInstance.address, [], {gas: gasLimit});
        await contractManagerInstance.setContractsAddress("SkaleToken", SkaleToken.address).then(function(res) {
            console.log("Contract Skale Token with address", SkaleToken.address, "registred in Contract Manager");
        });
        await deployer.deploy(ConstantsHolder, contractManagerInstance.address, {gas: gasLimit});
        await contractManagerInstance.setContractsAddress("Constants", ConstantsHolder.address).then(function(res) {
            console.log("Contract Constants with address", ConstantsHolder.address, "registred in Contract Manager");
        });
        await deployer.deploy(NodesData, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("NodesData", NodesData.address).then(function(res) {
            console.log("Contract Nodes Data with address", NodesData.address, "registred in Contract Manager");
        });
        await deployer.deploy(NodesFunctionality, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("NodesFunctionality", NodesFunctionality.address).then(function(res) {
            console.log("Contract Nodes Functionality with address", NodesFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(ValidatorsData, "ValidatorsFunctionality", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("ValidatorsData", ValidatorsData.address).then(function(res) {
            console.log("Contract Validators Data with address", ValidatorsData.address, "registred in Contract Manager");
        });
        await deployer.deploy(ValidatorsFunctionality, "SkaleManager", "ValidatorsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("ValidatorsFunctionality", ValidatorsFunctionality.address).then(function(res) {
            console.log("Contract Validators Functionality with address", ValidatorsFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsData, "SchainsFunctionalityInternal", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SchainsData", SchainsData.address).then(function(res) {
            console.log("Contract Schains Data with address", SchainsData.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsFunctionality, "SkaleManager", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SchainsFunctionality", SchainsFunctionality.address).then(function(res) {
            console.log("Contract Schains Functionality with address", SchainsFunctionality.address, "registred in Contract Manager");
        });
        await deployer.deploy(SchainsFunctionalityInternal, "SchainsFunctionality", "SchainsData", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SchainsFunctionalityInternal", SchainsFunctionalityInternal.address).then(function(res) {
            console.log("Contract Schains FunctionalityInternal with address", SchainsFunctionalityInternal.address, "registred in Contract Manager");
        });
        await deployer.deploy(Decryption, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("Decryption", Decryption.address).then(function(res) {
            console.log("Contract Decryption with address", Decryption.address, "registred in Contract Manager");
        });
        await deployer.deploy(ECDH, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("ECDH", ECDH.address).then(function(res) {
            console.log("Contract ECDH with address", ECDH.address, "registred in Contract Manager");
        });
        await deployer.deploy(SkaleDKG, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SkaleDKG", SkaleDKG.address).then(function(res) {
            console.log("Contract SkaleDKG with address", SkaleDKG.address, "registred in Contract Manager");
        });
        await deployer.deploy(SkaleVerifier, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SkaleVerifier", SkaleVerifier.address).then(function(res) {
            console.log("Contract SkaleVerifier with address", SkaleVerifier.address, "registred in Contract Manager");
        });
        await deployer.deploy(ManagerData, "SkaleManager", contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("ManagerData", ManagerData.address).then(function(res) {
            console.log("Contract Manager Data with address", ManagerData.address, "registred in Contract Manager");
        });
        await deployer.deploy(SkaleManager, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("SkaleManager", SkaleManager.address).then(function(res) {
            console.log("Contract Skale Manager with address", SkaleManager.address, "registred in Contract Manager");
        });
        await deployer.deploy(Pricing, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("Pricing", Pricing.address).then(function(res) {
            console.log("Contract Pricing with address", Pricing.address, "registred in Contract Manager");
        });
        await deployer.deploy(StringUtils, contractManagerInstance.address, {gas: gasLimit * gas_multiplier});
        await contractManagerInstance.setContractsAddress("StringUtils", StringUtils.address).then(function(res) {
            console.log("Contract StringUtils with address", StringUtils.address, "registred in Contract Manager");
        });
    
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
            string_utils_address: StringUtils.address,
            string_utils_abi: StringUtils.abi
        };

        await fsPromises.writeFile(`data/${network}.json`, JSON.stringify(jsonObject));
        await sleep(10000);
        console.log(`Done, check ${network}.json file in data folder.`);
    });

    
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
