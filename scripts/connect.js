require('dotenv').config();
const Tx = require('ethereumjs-tx');
let HDWalletProvider = require('truffle-hdwallet-provider');
let Web3 = require('web3');

let accountMain = process.env.ACCOUNT;
let privateKeyMain = process.env.PRIVATE_KEY;

let privateKeyBuf = new Buffer(privateKeyMain, "hex");

let dataJson = require("../data/SKALE_private_testnet.json");

let web3 = new Web3(new HDWalletProvider("7565496AC18CD1E90495C227A09E5DBF6848F1551CD8A4D3091153190AC49C32", "http://134.209.56.46:1919"));
let contractManager = new web3.eth.Contract(dataJson.contract_manager_abi, dataJson.contract_manager_address);

async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    await web3Inst.eth.getTransactionCount(account).then(nonce => {
        const rawTx = {
            from: account,
            nonce: "0x" + nonce.toString(16),
            data: data,
            to: receiverContract,
            gasPrice: 10000000000,
            gas: 8000000
        };

        const tx = new Tx(rawTx);
        tx.sign(privateKey);
    
        const serializedTx = tx.serialize();

        web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')).on('receipt', receipt => {
            console.log(receipt);
        });
    });

    console.log("Transaction done!");
}

function getFunctionAbi(contractName, contractsAddress) {
    return contractManager.methods.setContractsAddress(contractName, contractsAddress).encodeABI();
}

async function setEverything() {
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("NodesData", dataJson.nodes_data_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("NodesFunctionality", dataJson.nodes_functionality_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("ValidatorsData", dataJson.validators_data_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("ValidatorsFunctionality", dataJson.validators_functionality_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("SchainsData", dataJson.schains_data_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("SchainsFunctionality", dataJson.schains_functionality_address), dataJson.contract_manager_address);
    // await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("ManagerData", dataJson.manager_data_address), dataJson.contract_manager_address);
    await sendTransaction(web3, accountMain, privateKeyBuf, getFunctionAbi("SkaleManager", dataJson.skale_manager_address), dataJson.contract_manager_address);
}

setEverything();