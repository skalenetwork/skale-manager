const init = require("./Init.js");
const schains = require("./Schains.js");
const Tx = require("ethereumjs-tx").Transaction;
const Web3 = require('web3');
const GenerateBytesData = require("./GenerateBytesData.js");

async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    // console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000,
    };
    let tx;
    if (init.network === "unique") {
        console.log('RINKEBY')
        tx = new Tx(rawTx, {chain: "rinkeby"});
    } else {
        tx = new Tx(rawTx);
    }
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    console.log("Transaction done!");
    console.log("Gas used: ", txReceipt.gasUsed);
    console.log('------------------------------');
    return txReceipt.gasUsed;
}


async function initPublicKeysInProgressTest(groupIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.KeyStorage.methods.initPublicKeysInProgressTest(init.web3.utils.soliditySha3(groupIndex)).encodeABI();
    contractAddress = init.jsonData['key_storage_address'];
    console.log("------------------------------");
    console.log("initPublicKeysInProgressTest");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

async function removeAllBroadcastedDataExternalTest(groupIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.KeyStorage.methods.removeAllBroadcastedDataExternalTest(init.web3.utils.soliditySha3(groupIndex)).encodeABI();
    contractAddress = init.jsonData['key_storage_address'];
    console.log("------------------------------");
    console.log("removeAllBroadcastedDataExternalTest");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

async function deleteSchainsNodesPublicKeysExternalTest(groupIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.KeyStorage.methods.deleteSchainsNodesPublicKeysExternalTest(init.web3.utils.soliditySha3(groupIndex)).encodeABI();
    contractAddress = init.jsonData['key_storage_address'];
    console.log("------------------------------");
    console.log("deleteSchainsNodesPublicKeysExternalTest");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}


if (process.argv[2] == 'initPublicKeysInProgressTest') {
    initPublicKeysInProgressTest(process.argv[3]);
} else if (process.argv[2] == 'removeAllBroadcastedDataExternalTest') {
    removeAllBroadcastedDataExternalTest(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'deleteSchainsNodesPublicKeysExternalTest') {
    deleteSchainsNodesPublicKeysExternalTest(process.argv[3]);
}