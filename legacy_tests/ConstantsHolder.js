const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract, amount) {
    // console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 10000000000,
        gas: 8000000,
        value: web3Inst.utils.toHex(amount)
    };
    let tx;
    if (init.network !== "test") {
        tx = new Tx(rawTx, {chain: "rinkeby"});
    } else {
        tx = new Tx(rawTx);
    }
    tx.sign(privateKey);
    const serializedTx = tx.serialize();
    // console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    // console.log("Transaction done!");
    // console.log("Transaction receipt is - ");
    // console.log(txReceipt);
    return true;
}

async function setCheckTime(newCheckTime) {
    console.log("CheckTime: ", await init.ConstantsHolder.methods.checkTime().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setCheckTime(newCheckTime).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("CheckTime: ", await init.ConstantsHolder.methods.checkTime().call());
    // console.log("Exiting...");
    process.exit();
    
}

async function setLatency(newAllowableLatency) {
    console.log("allowableLatency: ", await init.ConstantsHolder.methods.allowableLatency().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setLatency(newAllowableLatency).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("allowableLatency: ", await init.ConstantsHolder.methods.allowableLatency().call());
    // console.log("Exiting...");
    process.exit();
    
}


async function setMSR(newmsr) {
    console.log("msr: ", await init.ConstantsHolder.methods.msr().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setMSR(newmsr).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("msr: ", await init.ConstantsHolder.methods.msr().call());
    // console.log("Exiting...");
    process.exit();
    
}


async function setLaunchTimestamp(param) {
    console.log("launchTimestamp: ", await init.ConstantsHolder.methods.launchTimestamp().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setLaunchTimestamp(param).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("launchTimestamp: ", await init.ConstantsHolder.methods.launchTimestamp().call());
    // console.log("Exiting...");
    process.exit();
    
}

async function setRotationDelay(param) {
    console.log("rotationDelay: ", await init.ConstantsHolder.methods.rotationDelay().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setRotationDelay(param).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("rotationDelay: ", await init.ConstantsHolder.methods.rotationDelay().call());
    // console.log("Exiting...");
    process.exit();
    
}

async function setProofOfUseDelegationPercentage(param) {
    console.log("proofOfUseDelegationPercentage: ", await init.ConstantsHolder.methods.proofOfUseDelegationPercentage().call());
    contractAddress = init.jsonData['constants_holder_address'];
    const functionABI = init.ConstantsHolder.methods.setProofOfUseDelegationPercentage(param).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, functionABI, contractAddress, "0");
    // console.log("Transaction was successful:", success);
    console.log("proofOfUseDelegationPercentage: ", await init.ConstantsHolder.methods.proofOfUseDelegationPercentage().call());
    // console.log("Exiting...");
    process.exit();
    
}

if (process.argv[2] == 'setCheckTime') {
    newCheckTime = process.argv[3];
    setCheckTime(newCheckTime);
}


if (process.argv[2] == 'setLatency') {
    newAllowableLatency = process.argv[3];
    setLatency(newAllowableLatency);
}

if (process.argv[2] == 'setMSR') {
    newMSR = process.argv[3];
    setMSR(newMSR);
}

if (process.argv[2] == 'setRotationDelay') {
    param = process.argv[3];
    setRotationDelay(param);
}


if (process.argv[2] == 'setPOUDP') {
    param = process.argv[3];
    setProofOfUseDelegationPercentage(param);
}

