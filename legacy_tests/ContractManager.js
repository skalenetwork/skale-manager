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

async function setContractsAddress(contractName, newAddress) {
    if (newAddress.length !== 42) {
        console.log("Length of address is wrong");
        process.exit();
    }
    try {
        newAddress = init.web3.utils.toChecksumAddress(newAddress);
    } catch (error) {
        console.log("Something wrong with address:", error);
        process.exit();
    }
    contractAddress = init.jsonData['contract_manager_address'];
    const setContractsAddressABI = init.ContractManager.methods.setContractsAddress(contractName, newAddress).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, setContractsAddressABI, contractAddress);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check get Contract after transaction: ", await init.ContractManager.methods.getContract(contractName).call());
    if ((await init.ContractManager.methods.getContract(contractName).call()).toString() === newAddress) {
        console.log("Address set correctly");
    } else {
        console.log("Something went wrong call Vadim, D2 or Artem");
    }
    console.log("Exiting...");
    process.exit()
}

async function getContract(contractName) {
    let address = await init.ContractManager.methods.getContract(contractName).call();
    console.log(contractName, " address is", address);
    process.exit();
}


if (process.argv[2] == 'setContractsAddress') {
    setContractsAddress(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'getContract') {
    getContract(process.argv[3]);
} else {
    console.log("Recheck name of function");
    process.exit();
}

