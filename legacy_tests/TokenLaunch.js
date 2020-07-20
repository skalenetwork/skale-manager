const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
const Web3 = require('web3');
const transfers = require("./transfers.json");



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
}

async function approveBatchOfTransfers() {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.TokenLaunchManager.methods.approveBatchOfTransfers(transfers.walletAddress, transfers.value).encodeABI();
    contractAddress = init.jsonData['token_launch_manager_address'];
    console.log("------------------------------");
    console.log("approveBatchOfTransfers");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

async function mint() {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SkaleToken.methods.mint(init.jsonData['token_launch_manager_address'], 1e9, "0x", "0x").encodeABI();
    console.log("------------------------------");
    console.log("mint");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, init.jsonData['skale_token_address']);
    process.exit();
}


async function getApproved(walletAddress) {
    let res = await init.TokenLaunchManager.methods.approved(walletAddress).call();
    console.log(res);
    process.exit();
}



if (process.argv[2] == 'approveBatchOfTransfers') {
    approveBatchOfTransfers();
} else if (process.argv[2] == 'getApproved') {
    getApproved(process.argv[3]);
} else if (process.argv[2] == 'mint') {
    mint();
} 