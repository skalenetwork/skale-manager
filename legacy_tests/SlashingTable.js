const init = require("./Init.js");
const { preProcessFile } = require("typescript");
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

async function setPenalty(offense, penalty) {
    console.log("Try to get previous penalty:", await init.SlashingTable.methods.getPenalty(offense).call());

    contractAddress = init.jsonData['slashing_table_address'];
    const setContractsAddressABI = init.SlashingTable.methods.setPenalty(offense, penalty).encodeABI();

    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, setContractsAddressABI, contractAddress);

    console.log("Transaction was successful:", success);
    console.log();
    console.log("Try to get new penalty after transaction:", await init.SlashingTable.methods.getPenalty(offense).call());

    if ((await init.SlashingTable.methods.getPenalty(offense).call()).toString() === penalty) {
        console.log("Penalty set correctly");
    } else {
        console.log("Something went wrong call Vadim, D2 or Artem");
    }
    console.log("Exiting...");
    process.exit()
}


if (process.argv[2] == 'setPenalty') {
    setPenalty(process.argv[3], process.argv[4]);
} else {
    console.log("Recheck name of function");
    process.exit();
}

