const init = require("./Init.js");
const { preProcessFile } = require("typescript");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    console.log(account);
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

async function grantRole(address) {
    const admin_role = await init.SkaleManager.methods.ADMIN_ROLE().call();
    const grantRoleABI = init.SkaleManager.methods.grantRole(admin_role, address).encodeABI();
    console.log("Is this address has admin role after transaction: ",await init.SkaleManager.methods.hasRole(admin_role, address).call());
    contractAddress = init.jsonData['skale_manager_address'];
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, grantRoleABI, contractAddress, "0");
    console.log("Is this address has admin role after transaction: ",await init.SkaleManager.methods.hasRole(admin_role, address).call());
    console.log()
    console.log("Transaction was successful:", success);
    console.log("Exiting...");
    process.exit()
}

async function forgive(holderAddress, amountOfToken) {
    if (holderAddress.length !== 42) {
        console.log("Length of address is wrong");
        process.exit();
    }
    try {
        holderAddress = init.web3.utils.toChecksumAddress(holderAddress);
    } catch (error) {
        console.log("Something wrong with address:", error);
        process.exit();
    }
    console.log("Try to get locked tokens from Punisher:", await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call());
    
    const previousLockedAmount = await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call();
    
    contractAddress = init.jsonData['punisher_address'];
    const setContractsAddressABI = init.Punisher.methods.forgive(holderAddress, amountOfToken).encodeABI();
    
    const privateKeyAdmin = process.env.PRIVATE_KEY_ADMIN;
    const accountAdmin = process.env.ACCOUNT_ADMIN;
    const admin_role = await init.SkaleManager.methods.ADMIN_ROLE().call();
    console.log("Is this address has admin role after transaction: ",await init.SkaleManager.methods.hasRole(admin_role, accountAdmin).call());
    const privateKeyB = Buffer.from(privateKeyAdmin, "hex");
    const success = await sendTransaction(init.web3, accountAdmin, privateKeyB, setContractsAddressABI, contractAddress);

    console.log("Transaction was successful:", success);
    console.log();
    console.log("Try to get locked tokens after transaction:", await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call());

    if (await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call() == parseInt(previousLockedAmount) - parseInt(amountOfToken)) {
        console.log("Forgave correctly");
    } else {
        console.log("Something went wrong call Vadim, D2 or Artem");
    }
    console.log("Exiting...");
    process.exit()
}

async function handleSlash(holderAddress, amountOfToken) {
    if (holderAddress.length !== 42) {
        console.log("Length of address is wrong");
        process.exit();
    }
    try {
        holderAddress = init.web3.utils.toChecksumAddress(holderAddress);
    } catch (error) {
        console.log("Something wrong with address:", error);
        process.exit();
    }
    console.log("Try to get locked tokens from Punisher:", await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call());

    const previousLockedAmount = await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call();

    contractAddress = init.jsonData['punisher_address'];
    const setContractsAddressABI = init.Punisher.methods.handleSlash(holderAddress, amountOfToken).encodeABI();

    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, setContractsAddressABI, contractAddress);

    console.log("Transaction was successful:", success);
    console.log();
    console.log("Try to get locked tokens from Punisher after transaction:", await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call());

    if ((await init.Punisher.methods.getAndUpdateLockedAmount(holderAddress).call()) == parseInt(amountOfToken) + parseInt(previousLockedAmount)) {
        console.log("Locked tokens set correctly");
    } else {
        console.log("Something went wrong call Vadim, D2 or Artem");
    }
    console.log("Exiting...");
    process.exit()
}


if (process.argv[2] == 'forgive') {
    forgive(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'handleSlash') {
    handleSlash(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'grantRole') {
    grantRole(process.argv[3]);
} else {
    console.log("Recheck name of function");
    process.exit();
}

