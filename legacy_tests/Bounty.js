const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000
        // chainId: await web3Inst.eth.getChainId()
    };
    const tx = new Tx(rawTx, {chain: "rinkeby"});
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    console.log("Transaction receipt is - ");
    console.log(txReceipt);
    console.log();
    return true;
}
async function enableBountyReduction() {
    console.log("Check bounty reduction: ", await init.Bounty.methods.bountyReduction().call());
    const enableBountyReductionABI = init.Bounty.methods.enableBountyReduction().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, enableBountyReductionABI, init.jsonData['bounty_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.Bounty.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
    
}

async function disableBountyReduction() {
    console.log("Check bounty reduction: ", await init.Bounty.methods.bountyReduction().call());
    const disableBountyReductionABI = init.Bounty.methods.disableBountyReduction().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, disableBountyReductionABI, init.jsonData['bounty_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.Bounty.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
}


if (process.argv[2] == 'enableBountyReduction') {
    enableBountyReduction();
} else if (process.argv[2] == 'disableBountyReduction') {
    disableBountyReduction();
} else {
    console.log("Recheck name of function");
    process.exit();
}
