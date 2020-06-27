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

async function disableWhitelist() {
    console.log("Use whitelist:", await init.ValidatorService.methods.useWhitelist().call());
    contractAddress = init.jsonData['validator_service_address'];
    const disableWhitelistABI = init.ValidatorService.methods.disableWhitelist().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, disableWhitelistABI, contractAddress, "0");
    console.log("Transaction was successful:", success);
    console.log("Use whitelist after Transaction: ", await init.ValidatorService.methods.useWhitelist().call());
    console.log("Exiting...");
    process.exit();
    
}

async function grantRole(address) {
    const admin_role = await init.SkaleManager.methods.ADMIN_ROLE().call();
    console.log("Is this address has admin role: ",await init.SkaleManager.methods.hasRole(admin_role, address).call());
    const grantRoleABI = init.SkaleManager.methods.grantRole(admin_role, address).encodeABI(); //.send({from: init.mainAccount});
    contractAddress = init.jsonData['skale_manager_address'];
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, grantRoleABI, contractAddress, "0");
    console.log("Is this address has admin role after transaction: ",await init.SkaleManager.methods.hasRole(admin_role, address).call());
    console.log()
    console.log("Transaction was successful:", success);
    console.log("Exiting...");
    process.exit()
}

async function enableValidator(validatorId) {
    console.log("Whitelist of validators:", await init.ValidatorService.methods.getTrustedValidators().call());
    contractAddress = init.jsonData['validator_service_address'];
    const functionABI = init.ValidatorService.methods.enableValidator(validatorId).encodeABI();
    const privateKeyAdmin = process.env.PRIVATE_KEY_ADMIN;
    const accountAdmin = process.env.ACCOUNT_ADMIN;
    const privateKeyB = Buffer.from(privateKeyAdmin, "hex");
    const success = await sendTransaction(init.web3, accountAdmin, privateKeyB, functionABI, contractAddress, "0");
    console.log("Transaction was successful:", success);
    console.log("Whitelist of validators:", await init.ValidatorService.methods.getTrustedValidators().call());
    console.log("Exiting...");
    process.exit();
}

async function disableValidator(validatorId) {
    console.log("Whitelist of validators:", await init.ValidatorService.methods.getTrustedValidators().call());
    contractAddress = init.jsonData['validator_service_address'];
    const functionABI = init.ValidatorService.methods.disableValidator(validatorId).encodeABI();
    const privateKeyAdmin = process.env.PRIVATE_KEY_ADMIN;
    const accountAdmin = process.env.ACCOUNT_ADMIN;
    const privateKeyB = Buffer.from(privateKeyAdmin, "hex");
    const success = await sendTransaction(init.web3, accountAdmin, privateKeyB, functionABI, contractAddress, "0");
    console.log("Transaction was successful:", success);
    console.log("Whitelist of validators:", await init.ValidatorService.methods.getTrustedValidators().call());
    console.log("Exiting...");
    process.exit();
}

if (process.argv[2] == 'disableWhitelist') {
    disableWhitelist();
} else if (process.argv[2] == 'grantRole') {
    grantRole(process.argv[3]);
} else if (process.argv[2] == 'enableValidator') {
    validatorId = Number(process.argv[3]);
    enableValidator(validatorId);
} else if (process.argv[2] == 'disableValidator') {
    validatorId = Number(process.argv[3]);
    disableValidator(validatorId);
} else {
    console.log("Recheck name of function");
    process.exit();
}