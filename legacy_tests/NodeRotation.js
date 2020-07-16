const init = require("./Init.js");
const schains = require("./Schains.js");
const Tx = require("ethereumjs-tx").Transaction;
const Web3 = require('web3');
const GenerateBytesData = require("./GenerateBytesData.js");

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
    return txReceipt.gasUsed;
}


// nodeRotation.freezeSchains(nodeIndex);
// nodes.initExit(nodeIndex)
// nodeRotation.exitFromSchain(nodeIndex)
// nodes.completeExit(nodeIndex);
// nodes.changeNodeFinishTime(nodeIndex, now.add(isSchains ? constants.rotationDelay() : 0));
// monitors.removeCheckedNodes(nodeIndex);
// monitors.deleteMonitor(nodeIndex);
// nodes.deleteNodeForValidator(validatorId, nodeIndex);



async function freezeSchains(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.NodeRotation.methods.freezeSchains(nodeIndex).encodeABI();
    contractAddress = init.jsonData['node_rotation_address'];
    console.log("------------------------------");
    console.log("freezeSchains");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function initExit(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Nodes.methods.initExit(nodeIndex).encodeABI();
    contractAddress = init.jsonData['nodes_address'];
    console.log("------------------------------");
    console.log("initExit");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function isSchainExist(schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SchainsInternal.methods.isSchainExist(schainId).encodeABI();
    contractAddress = init.jsonData['schains_internal_address'];
    console.log("------------------------------");
    console.log("isSchainExist");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function isAnyFreeNode(schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SchainsInternal.methods.isAnyFreeNode(schainId).encodeABI();
    contractAddress = init.jsonData['schains_internal_address'];
    console.log("------------------------------");
    console.log("isAnyFreeNode");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function rotateNode(nodeIndex, schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.NodeRotation.methods.rotateNode(nodeIndex, schainId).encodeABI();
    contractAddress = init.jsonData['node_rotation_address'];
    console.log("------------------------------");
    console.log("rotateNode");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function removeNodeFromSchain(nodeIndex, schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SchainsInternal.methods.removeNodeFromSchain(nodeIndex, schainId).encodeABI();
    contractAddress = init.jsonData['schains_internal_address'];
    console.log("------------------------------");
    console.log("removeNodeFromSchain");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function selectNodeToGroup(schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.NodeRotation.methods.selectNodeToGroup(schainId).encodeABI();
    contractAddress = init.jsonData['node_rotation_address'];
    console.log("------------------------------");
    console.log("selectNodeToGroup");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function reopenChannel(schainId) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SkaleDKG.methods.reopenChannel(schainId).encodeABI();
    contractAddress = init.jsonData['skale_d_k_g_address'];
    console.log("------------------------------");
    console.log("reopenChannel");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

if (process.argv[2] == 'freezeSchains') {
    freezeSchains(process.argv[3]);
} else if (process.argv[2] == 'initExit') {
    initExit(process.argv[3]);
} else if (process.argv[2] == 'exitFromSchain') {
    exitFromSchain(process.argv[3]);
} else if (process.argv[2] == 'completeExit') {
    completeExit(process.argv[3]);
} else if (process.argv[2] == 'changeNodeFinishTime') {
    changeNodeFinishTime(process.argv[3]);
} else if (process.argv[2] == 'removeCheckedNodes') {
    removeCheckedNodes(process.argv[3]);
} else if (process.argv[2] == 'deleteMonitor') {
    deleteMonitor(process.argv[3]);
} else if (process.argv[2] == 'deleteNodeForValidator') {
    deleteNodeForValidator(process.argv[3]);
} else if (process.argv[2] == 'isSchainExist') {
    isSchainExist(process.argv[3]);
} else if (process.argv[2] == 'isAnyFreeNode') {
    isAnyFreeNode(process.argv[3]);
} else if (process.argv[2] == 'rotateNode') {
    rotateNode(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'removeNodeFromSchain') {
    removeNodeFromSchain(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'selectNodeToGroup') {
    selectNodeToGroup(process.argv[3]);
} else if (process.argv[2] == 'reopenChannel') {
    reopenChannel(process.argv[3]);
} 





async function exitFromSchain(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.NodeRotation.methods.exitFromSchain(nodeIndex).encodeABI();
    contractAddress = init.jsonData['node_rotation_address'];
    console.log("------------------------------");
    console.log("exitFromSchain");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}


async function completeExit(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Nodes.methods.completeExit(nodeIndex).encodeABI();
    contractAddress = init.jsonData['nodes_address'];
    console.log("------------------------------");
    console.log("completeExit");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}


async function changeNodeFinishTime(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Nodes.methods.changeNodeFinishTime(nodeIndex, 300).encodeABI();
    contractAddress = init.jsonData['nodes_address'];
    console.log("------------------------------");
    console.log("changeNodeFinishTime");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function removeCheckedNodes(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Monitors.methods.removeCheckedNodes(nodeIndex).encodeABI();
    contractAddress = init.jsonData['monitors_address'];
    console.log("------------------------------");
    console.log("removeCheckedNodes");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function deleteMonitor(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Monitors.methods.deleteMonitor(nodeIndex).encodeABI();
    contractAddress = init.jsonData['monitors_address'];
    console.log("------------------------------");
    console.log("deleteMonitor");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}



async function deleteNodeForValidator(nodeIndex) {
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.Nodes.methods.deleteNodeForValidator(1, nodeIndex).encodeABI();
    contractAddress = init.jsonData['nodes_address'];
    console.log("------------------------------");
    console.log("deleteNodeForValidator");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}
