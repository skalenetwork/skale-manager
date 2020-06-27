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
    const enableBountyReductionABI = init.SkaleManager.methods.enableBountyReduction().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, enableBountyReductionABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.SkaleManager.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
    
}

async function disableBountyReduction() {
    console.log("Check bounty reduction: ", await init.SkaleManager.methods.bountyReduction().call());
    contractAddress = init.jsonData['skale_manager_address'];
    const disableBountyReductionABI = init.SkaleManager.methods.disableBountyReduction().encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const success = await sendTransaction(init.web3, init.mainAccount, privateKeyB, disableBountyReductionABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.SkaleManager.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
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

async function deleteSchain(schainName) {
    console.log("Check is schain exist: ", await init.SchainsInternal.methods.isSchainExist(web3.utils.soliditySha3(schainName)).call());
    contractAddress = init.jsonData['skale_manager_address'];
    const disableWhitelistABI = init.SkaleManager.methods.deleteSchainByRoot(schainName).encodeABI();
    const privateKeyOwner = process.env.PRIVATE_KEY_ADMIN;
    const accountOwner = process.env.ACCOUNT_ADMIN;
    const privateKeyB = Buffer.from(privateKeyOwner, "hex");
    const success = await sendTransaction(init.web3, accountOwner, privateKeyB, disableWhitelistABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check bounty reduction after transaction: ", await init.SkaleManager.methods.bountyReduction().call());
    console.log("Exiting...");
    process.exit()
}
// enableBountyReduction();
// disableBountyReduction();
// grantRole(process.env.ACCOUNT_ADMIN)
// deleteSchain("Name");


if (process.argv[2] == 'enableBountyReduction') {
    enableBountyReduction();
}

if (process.argv[2] == 'disableBountyReduction') {
    disableBountyReduction();
}

if (process.argv[2] == 'grantRole') {
    grantRole(process.argv[3]);
}

if (process.argv[2] == 'deleteSchain') {
    deleteSchain(process.argv[3]);
}

