const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract, amount) {
    console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000,
        value: web3Inst.utils.toHex(amount)
        // chainId: await web3Inst.eth.getChainId()
    };
    let tx;
    if (init.network !== "test") {
        tx = new Tx(rawTx, {chain: "rinkeby"});
    } else {
        tx = new Tx(rawTx);
    }
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
    console.log("Use whitelist:", await init.ValidatorService.methods.useWhitelist().call());
    contractAddress = init.jsonData['validator_service_address'];
    const disableWhitelistABI = init.ValidatorService.methods.disableWhitelist().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    // console.log(await )
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, disableWhitelistABI, contractAddress, "0");
    console.log("Transaction was successful:", success);
    console.log("Use whitelist after Transaction: ", await init.ValidatorService.methods.useWhitelist().call());
    console.log("Exiting...");
    process.exit()
}
disableWhiteList();