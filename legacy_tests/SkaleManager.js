const init = require("./Init.js");
const nodes = require("./Nodes.js");
const Tx = require("ethereumjs-tx").Transaction;
async function sendTransaction(web3Inst, account, privateKey, data, receiverContract) {
    // console.log("Transaction generating started!");
    const nonce = await web3Inst.eth.getTransactionCount(account);
    const rawTx = {
        from: web3Inst.utils.toChecksumAddress(account),
        nonce: "0x" + nonce.toString(16),
        data: data,
        to: receiverContract,
        gasPrice: 100000000000,
        gas: 8000000
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
    // console.log("Transaction sent!")
    const txReceipt = await web3Inst.eth.sendSignedTransaction('0x' + serializedTx.toString('hex')); //.on('receipt', receipt => {
    // console.log("Transaction done!");
    // console.log("Gas used: ", txReceipt.gasUsed);
    // console.log('------------------------------');
    return txReceipt.gasUsed;
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

async function deleteSchain(schainName) {
    console.log("Check is schain exist: ", await init.SchainsInternal.methods.isSchainExist(init.web3.utils.soliditySha3(schainName)).call());
    contractAddress = init.jsonData['skale_manager_address'];
    const deleteSchainABI = init.SkaleManager.methods.deleteSchainByRoot(schainName).encodeABI();
    const privateKeyAdmin = process.env.PRIVATE_KEY_ADMIN;
    const accountAdmin = process.env.ACCOUNT_ADMIN;
    const privateKeyB = Buffer.from(privateKeyAdmin, "hex");
    const success = await sendTransaction(init.web3, accountAdmin, privateKeyB, deleteSchainABI, init.jsonData['skale_manager_address']);
    console.log("Transaction was successful:", success);
    console.log();
    console.log("Check is schain exist after transaction: ", await init.SchainsInternal.methods.isSchainExist(init.web3.utils.soliditySha3(schainName)).call());
    console.log("Exiting...");
    process.exit()
}

async function changeReward(nodeIndex) {
    console.log(await init.Nodes.methods.getNodeLastRewardDate(nodeIndex).call());
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Nodes.methods.skipNodeLastRewardDate(nodeIndex).encodeABI();
    contractAddress = init.jsonData['nodes_address'];
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    console.log(await init.Nodes.methods.getNodeLastRewardDate(nodeIndex).call());
    process.exit();
}

async function calculateNormalBounty(nodeIndex) {
    console.log();
    console.log("Should show normal bounty for ", nodeIndex, " node");
    console.log("Normal bounty : ", await init.Bounty.methods.calculateNormalBounty(nodeIndex).call());
    console.log();
    process.exit();
}

async function getBounty(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SkaleManager.methods.getBounty(nodeIndex).encodeABI();
    contractAddress = init.jsonData['skale_manager_address'];
    const gasUsed = await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    console.log(gasUsed);
    // process.exit();
}

if (process.argv[2] == 'grantRole') {
    grantRole(process.argv[3]);
} else if (process.argv[2] == 'deleteSchain') {
    deleteSchain(process.argv[3]);
} else if (process.argv[2] == 'calculateNormalBounty') {
    calculateNormalBounty(process.argv[3]);
} else if (process.argv[2] == 'getBounty') {
    getBounty(process.argv[3]);
} else if (process.argv[2] == 'getBountyForNodes') {
    getBountyForNodes();
} else if (process.argv[2] == 'balanceOf') {
    balanceOf(process.argv[3]);
} else if (process.argv[2] == 'test') {
    test();
} else if (process.argv[2] == 'c') {
    changeReward(process.argv[3]);
}


async function test() {
    for (let i = 0; i < 100; i++) {
        await changeReward(i);
        await getBounty(i);
    }
    
}



async function balanceOf(address) {
    console.log(await init.SkaleToken.methods.balanceOf(address).call());

}