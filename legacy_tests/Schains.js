const init = require("./Init.js");
const Tx = require("ethereumjs-tx").Transaction;
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
    console.log("Block number: ", txReceipt.blockNumber);
    console.log('------------------------------');
    return txReceipt.gasUsed;
}

async function createSchain(typeOfSchain, schainName) {
    const scr = await init.Schains.methods.SCHAIN_CREATOR_ROLE().call({from: init.mainAccount});
    let abi = await init.Schains.methods.grantRole(scr, init.mainAccount).encodeABI();
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    let contractAddress = init.jsonData['schains_address'];
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);

    abi = await init.Schains.methods.addSchainByFoundation(5, typeOfSchain, 1, schainName).encodeABI();
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);

    // abi = await init.SkaleDKG.methods.setSuccesfulDKGPublic(init.web3.utils.soliditySha3(schainName)).encodeABI();
    // contractAddress = init.jsonData['skale_d_k_g_tester_address'];
    // await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

// async function deleteSchain(schainName) {
//     let abi = await init.SkaleManager.methods.deleteSchain(schainName).encodeABI();
//     let privateKeyB = Buffer.from(init.privateKey, "hex");
//     let contractAddress = init.jsonData['schains_address'];
//     await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
// }

async function getSchain(schainName) {
    let res = await init.SchainsInternal.methods.schains(init.web3.utils.soliditySha3(schainName)).call();
    console.log(res);
    return res;
}

async function getSchainNodes(schainName) {
    let res = await init.SchainsInternal.methods.getNodesInGroup(init.web3.utils.soliditySha3(schainName)).call();
    console.log("Schain name:", schainName);
    console.log("Nodes in Schain", res);
    process.exit();
    // return res;
}

async function getSchainIdsForNode(nodeIndex) {
    let res = await init.SchainsInternal.methods.getSchainIdsForNode(nodeIndex).call();
    console.log(res);
    process.exit();
    // return res;
}

async function getActiveSchain(nodeIndex) {
    let res = await init.SchainsInternal.methods.getActiveSchain(nodeIndex).call();
    console.log(res);
    process.exit();
    // return res;
}

async function isLastDKGSuccesful(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.isLastDKGSuccesful(groupIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function isAllDataReceived(name, nodeIndex) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.isAllDataReceived(groupIndex, nodeIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function getChannels(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.dkgProcess(groupIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function getBroadcastedData(name, nodeIndex) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.KeyStorage.methods.getBroadcastedData(groupIndex, nodeIndex).call();
    console.log(res);
    // console.log("Did everything!");
    process.exit();

    // return res;
}

async function getComplaintData(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.getComplaintData(groupIndex).call();
    console.log(res);
    // console.log("Did everything!");getComplaintData
    process.exit();

    // return res;getComplaintData
}


async function getTimeOfLastSuccesfulDKG(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.getTimeOfLastSuccesfulDKG(groupIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function getChannelStartedTime(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.getChannelStartedTime(groupIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function channels(name) {
    let groupIndex = init.web3.utils.soliditySha3(name);
    let res = await init.SkaleDKG.methods.channels(groupIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}


async function isNodeLeft(nodeIndex) {
    let res = await init.Nodes.methods.isNodeLeft(nodeIndex).call();
    console.log(res);
    console.log("Did everything!");
    process.exit();

    // return res;
}

async function getSchainName(schainId) {
     const schainName = await init.SchainsInternal.methods.getSchainName(schainId).call();
     console.log(schainName);
     return schainName;
}

async function getSchainsForNode(nodeIndex) {
    let res = await init.SchainsInternal.methods.getActiveSchains(nodeIndex).call();
    // console.log(res);
    let res1;
    for (let i = 0; i < res.length; i++) {
        res1 = await init.SchainsInternal.methods.schains(res[i]).call();
        console.log(res1.name);
        // console.log(res1);
    }
    return res;
}

async function getEvent(blockNumber) {
    await init.SkaleDKG.getPastEvents('ChannelOpened', {fromBlock: blockNumber, toBlock: blockNumber}).then(
        function(events) {
            for (let i = 0; i < events.length; i++) {
                console.log(events[i].returnValues);
            }
    });
    process.exit();
    
}

// before reopenChannel gas used 2386464
// before initPublicKeysInProgress 2602197



// createSchain(4, 'ouue');

module.exports.createSchain = createSchain;
// module.exports.deleteSchain = deleteSchain;
module.exports.getSchain = getSchain;
module.exports.getSchainNodes = getSchainNodes;
module.exports.getSchainName = getSchainName;
module.exports.getSchainsForNode = getSchainsForNode;


if (process.argv[2] == 'getSchainNodes') {
    getSchainNodes(process.argv[3]);
} else if (process.argv[2] == 'createSchain') {
    createSchain(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'getSchainsForNode') {
    getSchainsForNode(process.argv[3]);
} else if (process.argv[2] == 'getSchainIdsForNode') {
    getSchainIdsForNode(process.argv[3]);
} else if (process.argv[2] == 'getActiveSchain') {
    getActiveSchain(process.argv[3]);
} else if (process.argv[2] == 'isLastDKGSuccesful') {
    isLastDKGSuccesful(process.argv[3]);
} else if (process.argv[2] == 'isNodeLeft') {
    isNodeLeft(process.argv[3]);
} else if (process.argv[2] == 'isAllDataReceived') {
    isAllDataReceived(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'getChannels') {
    getChannels(process.argv[3]);
} else if (process.argv[2] == 'getBroadcastedData') {
    getBroadcastedData(process.argv[3], process.argv[4]);
} else if (process.argv[2] == 'getComplaintData') {
    getComplaintData(process.argv[3]);
} else if (process.argv[2] == 'getTimeOfLastSuccesfulDKG') {
    getTimeOfLastSuccesfulDKG(process.argv[3]);
} else if (process.argv[2] == 'channels') {
    channels(process.argv[3]);
} else if (process.argv[2] == 'getChannelStartedTime') {
    getChannelStartedTime(process.argv[3]);
} else if (process.argv[2] == 'e') {
    getEvent(process.argv[3]);
} else if (process.argv[2] == 'getSchainName') {
    getSchainName(process.argv[3]);
}








// getChannels





async function createSchain_legacy(typeOfSchain, lifetime) {
    let account = init.mainAccount;
    let schainName = generateRandomName();
    let k = await init.SchainsInternal.methods.isSchainNameAvailable(schainName).call();
    while (!k) {
        schainName = generateRandomName();
        k = await init.SchainsInternal.methods.isSchainNameAvailable(schainName).call();
    }
    let data = await GenerateBytesData.generateBytesForSchain(lifetime, typeOfSchain, schainName);
    console.log("Generated data:", data);
    let res = await init.Schains.methods.getSchainPrice(typeOfSchain, lifetime).call();
    console.log("Schain Price:", res);
	let deposit = res;
	let accountDeposit = await init.SkaleToken.methods.balanceOf(account).call();
    let numberOfFullNodes = await init.Nodes.methods.getNumberOfFullNodes().call();
    let numberOfFractionalNodes = await init.Nodes.methods.getNumberOfFractionalNodes().call();
    let numberOfNodes = await init.Nodes.methods.getNumberOfNodes().call();
	console.log("Account:                    ", account);
	console.log("Data:                       ", data);
	console.log("Deposit:                    ", deposit);
	console.log("Account Deposit:            ", accountDeposit);
    console.log("Number of nodes:            ", numberOfNodes);
    console.log("Number of full nodes:       ", numberOfFullNodes);
    console.log("NUmber of fractional nodes: ", numberOfFractionalNodes);
	res = await init.SkaleToken.methods.transfer(init.jsonData['skale_manager_address'], deposit, data).send({from: account, gas: 6900000});
    let blockNumber = res.blockNumber;
    //init.Schains.getPastEvents("GroupGenerated", {fromBlock: blockNumber, toBlock:blockNumber}).then(function(events) {console.log(events)});
    //init.Schains.getPastEvents("SchainCreated", {fromBlock: blockNumber, toBlock:blockNumber}).then(function(events) {console.log(events)});
    //console.log(schainName);
    console.log("Schain", schainName, "created with", res.gasUsed, "gas comsumption");
    return schainName;
}


function generateRandomName() {
	let number = Math.floor(Math.random() * 100000);
	return "Schain" + number;
}
