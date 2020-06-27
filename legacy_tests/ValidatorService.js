const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract, amount) {
    console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount("7E6CE355Ca303EAe3a858c172c3cD4CeB23701bc");
    console.log(nonce);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000,
        value: web3Inst.utils.toHex(amount)
    };
    const tx = new Tx(rawTx, {chain: 'test'});
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    console.log("Transaction done!");
    console.log("Transaction receipt is - ");
    console.log(txReceipt);
    return true;
}
async function disableWhiteList() {
    contractAddress = init.jsonData['validator_service_address'];
    contractABI = init.jsonData['validator_service_abi'];
    let privateKeyB = Buffer.from(String(init.privateKey), "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, contractABI, contractAddress, "0");
    console.log("Transaction was successful:", success);
    console.log("Exiting...");
    process.exit()
}
disableWhiteList();