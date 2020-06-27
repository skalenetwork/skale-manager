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
    console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    console.log("Transaction done!");
    console.log("Transaction receipt is - ");
    console.log(txReceipt);
    console.log();
    return true;
}
async function enableBountyReduction() {
    console.log("Check bounty reduction: ", await init.SkaleManager.methods.bountyReduction().call());
    contractAddress = init.jsonData['skale_manager_address'];
    const disableWhitelistABI = init.SkaleManager.methods.enableBountyReduction().encodeABI();
    const privateKeyOwner = process.env.PRIVATE_KEY;
    const accountOwner = process.env.ACCOUNT;
    const privateKeyB = Buffer.from(privateKeyOwner, "hex");
    const success = await sendTransaction(init.web3, accountOwner, privateKeyB, disableWhitelistABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.SkaleManager.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
    
}
async function disableBountyReduction() {
    console.log("Check bounty reduction: ", await init.SkaleManager.methods.bountyReduction().call());
    contractAddress = init.jsonData['skale_manager_address'];
    const disableWhitelistABI = init.SkaleManager.methods.disableBountyReduction().encodeABI();
    const privateKeyOwner = process.env.PRIVATE_KEY;
    const accountOwner = process.env.ACCOUNT;
    const privateKeyB = Buffer.from(privateKeyOwner, "hex");
    const success = await sendTransaction(init.web3, accountOwner, privateKeyB, disableWhitelistABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.SkaleManager.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
    
}
enableBountyReduction();
// disableBountyReduction();