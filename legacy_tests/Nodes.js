const init = require("./Init.js");
const schains = require("./Schains.js");
const Tx = require("ethereumjs-tx").Transaction;
const Web3 = require('web3');
const GenerateBytesData = require("./GenerateBytesData.js");
const elliptic = require("elliptic");
const EC = elliptic.ec;
const ec = new EC("secp256k1");

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
    console.log("OK");
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


async function skipRotationDelay(schainId) {
    //skip rotation delay for schain 
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.NodeRotation.methods.skipRotationDelay(schainId).encodeABI();
    contractAddress = init.jsonData['node_rotation_address'];
    console.log("------------------------------");
    console.log("skipRotationDelay");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function getRotation(name) {
    let schainIndex = init.web3.utils.soliditySha3(name);
    let res = await init.NodeRotation.methods.getRotation(schainIndex).call();
    console.log(res);
     console.log("Did everything!");
    return res;
}

async function setSuccesfulDKGPublic(schainId) {
    // set successful dkg for schain
    schainName = await schains.getSchainName(schainId);
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    abi = await init.SkaleDKG.methods.setSuccesfulDKGPublic(init.web3.utils.soliditySha3(schainName)).encodeABI();
    contractAddress = init.jsonData['skale_d_k_g_tester_address'];
    console.log("------------------------------");
    console.log("setSuccesfulDKGPublic");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}

async function nodeExitFull(nodeIndex) {
    console.log("Schains on node ", nodeIndex, " BEFORE rotation:")
    const schainsForNode = await schains.getSchainsForNode(nodeIndex);
    for (let i = 0; i < schainsForNode.length; i++) {
        let abi = await init.SkaleManager.methods.nodeExit(nodeIndex).encodeABI();
        let privateKeyB = Buffer.from(init.privateKey, "hex");
        let contractAddress = init.jsonData['skale_manager_address'];
        console.log("------------------------------");
        console.log("NodeExit");
        await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
        console.log("Schains on node ", nodeIndex, " AFTER rotation:")
        const schainsForNodeAfterRotation = await schains.getSchainsForNode(nodeIndex);
        let schainId = schainsForNode.filter(x => schainsForNodeAfterRotation.indexOf(x) == -1);
        await skipRotationDelay(schainId[0]);
        await setSuccesfulDKGPublic(schainId[0]);
    }
    process.exit();
}


async function nodeExit(nodeIndex) {
    console.log("Schains on node ", nodeIndex, " BEFORE rotation:")
    const schainsForNode = await schains.getSchainsForNode(nodeIndex);
    let abi = await init.SkaleManager.methods.nodeExit(nodeIndex).encodeABI();
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    let contractAddress = init.jsonData['skale_manager_address'];
    console.log("------------------------------");
    console.log("NodeExit");
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    console.log("Schains on node ", nodeIndex, " AFTER rotation:")
    const schainsForNodeAfterRotation = await schains.getSchainsForNode(nodeIndex);
    let schainId = schainsForNode.filter(x => schainsForNodeAfterRotation.indexOf(x) == -1);
    // await skipRotationDelay(schainId[0]);
    // await setSuccesfulDKGPublic(schainId[0]);
    process.exit();
}




async function getFreeSpace(nodes) {
    for (let i = 0; i < nodes.length; i++) {
        const freeSpace = await init.Nodes.methods.spaceOfNodes(nodes[i]).call();
        console.log(nodes[i], ':', freeSpace.freeSpace);
    }
    process.exit();
}

async function registerValidator() {
    let abi = await init.ValidatorService.methods.registerValidator("Validator", "V", 0, 0).encodeABI();
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    let contractAddress = init.jsonData['validator_service_address'];
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);

    abi = await init.ValidatorService.methods.enableValidator(1).encodeABI();
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
    process.exit();
}

async function makeNodeVisible(nodeIndex) {
    let abi = await init.Nodes.methods.makeNodeVisible(nodeIndex).encodeABI();
    let privateKeyB = Buffer.from(init.privateKey, "hex");
    let contractAddress = init.jsonData['nodes_address'];
    await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
}


async function createNodes(nodesCount) {
    const numberOfNodes = await init.Nodes.methods.getNumberOfNodes().call();
    for (let index = parseInt(numberOfNodes)+1; index <= parseInt(nodesCount) + parseInt(numberOfNodes); index++) {
        const hexIndex = ("0" + index.toString(16)).slice(-2);
        const pubKey = ec.keyFromPrivate(init.privateKey).getPublic();
        const abi = await init.SkaleManager.methods.createNode(
            8545, // port
            0, // nonce
            "0x7f0003" + hexIndex, // ip
            "0x7f0003" + hexIndex, // public ip
            ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
            "D2-3" + hexIndex, // name
        ).encodeABI();
        const privateKeyB = Buffer.from(init.privateKey, "hex");
        const contractAddress = init.jsonData['skale_manager_address'];

        const gasUsed = await sendTransaction(init.web3, init.mainAccount, privateKeyB, abi, contractAddress);
        console.log("Node ", index, " ", gasUsed);
    }
    process.exit();
}


async function deleteNode(nodeIndex) {
    let res = await init.SkaleManager.methods.deleteNode(nodeIndex).send({from: init.mainAccount, gas: 6900000});
    console.log("Node:", nodeIndex, "deleted with", res.gasUsed, "gas consumption");
}

async function getNode(nodeIndex) {
    let res = await init.Nodes.methods.nodes(nodeIndex).call();
    console.log("Node index:", nodeIndex);
    console.log("Node name:", res.name);
    console.log(res);
    res = await init.Nodes.methods.getNodeIP(nodeIndex).call();
    console.log("Node IP:", res);

    return res;
}

async function getNodePublicKey(nodeIndex) {
    let res = await init.Nodes.methods.getNodePublicKey(nodeIndex).call();
    console.log(res);
    process.exit();
}

async function getNumberOfNodes() {
    let res = await init.Nodes.methods.getNumberOfNodes().call();
    console.log(res);
    process.exit();
}

async function getNodeNextRewardDate(nodeIndex) {
    let res = await init.Nodes.methods.nodes(nodeIndex).call();
    console.log(res);
    let res1 = await init.Nodes.methods.getNodeNextRewardDate(nodeIndex).call();
    console.log(res1);
    console.log("Did everything!");
    return res;
}

async function nodesNameCheck(name) {
    let res = await init.Nodes.methods.nodesNameCheck(await init.web3.utils.soliditySha3(name)).call();
    console.log(res);
    
}

async function nodesIpCheck(ip) {
    let res = await init.Nodes.methods.nodesIPCheck(ip).call();
    console.log(res);
    
}

async function checkPossibilityCreatingNode(address) {
    let res = await init.Nodes.methods.checkPossibilityCreatingNode(address).call();
    console.log(res);
    
}


async function getActiveNodeIPs() {
    let res = await init.Nodes.methods.getActiveNodeIPs().call();
    console.log(res);
    process.exit();
}

async function getActiveNodeIds() {
    let res = await init.Nodes.methods.getActiveNodeIds().call();
    console.log(res);
    process.exit();
}

async function getNodeAddress(nodeIndex) {
    let res = await init.Nodes.methods.getNodeAddress(nodeIndex).call();
    console.log(res);
    process.exit();
}

async function getDelegationTotal(validatorId) {
    let len = await init.DelegationController.methods.getDelegationsByValidatorLength(validatorId).call();
    console.log(len);
    let total = 0;
    for (let i = 0; i < len; i++) {
        let delId = await init.DelegationController.methods.delegationsByValidator(validatorId, i).call();
        let delParam = await init.DelegationController.methods.getDelegation(delId).call();
        if (delParam['created'] > 0) {
            console.log(delParam['amount']);
            let am = delParam['amount'];
            total += Number(am);
        }
        console.log(total);
    }
}

async function setDelegationPeriod() {
    let stakeMultipliers = await init.DelegationPeriodManager.methods.stakeMultipliers(3).call();
    console.log("Delegation Period for 3", stakeMultipliers);
    stakeMultipliers = await init.DelegationPeriodManager.methods.stakeMultipliers(2).call();
    console.log("Delegation Period for 2", stakeMultipliers);
    const setDelegationPeriod = await init.DelegationPeriodManager.methods.setDelegationPeriod(2, 100).encodeABI();
    const privateKeyB = Buffer.from(init.privateKey, "hex");
    const contractAddress = init.jsonData['delegation_period_manager_address'];
    console.log(init.privateKey);
    console.log(init.mainAccount);
    console.log(contractAddress);

    const gasUsed = await sendTransaction(init.web3, init.mainAccount, privateKeyB, setDelegationPeriod, contractAddress);
    console.log("Transaction completed");
    stakeMultipliers = await init.DelegationPeriodManager.methods.stakeMultipliers(2).call();
    console.log("Delegation Period for 2", stakeMultipliers);
    
}

async function createNodes1(n) {
    let nodeIndexes = new Array(n);
    for (let i = 0; i < n; i++) {
        nodeIndexes[i] = await createNode();
    }
    return nodeIndexes;
}

async function makeNodesVisible() {
    await makeNodeVisible(20);
    await makeNodeVisible(19);
    await makeNodeVisible(18);
    await makeNodeVisible(17);
    await makeNodeVisible(16);
}

// createNodes(1);
// getNodeNextRewardDate(0)

// module.exports.createNode = createNode;
module.exports.createNodes = createNodes;
module.exports.getNode = getNode;
module.exports.deleteNode = deleteNode;
module.exports.getNodeNextRewardDate = getNodeNextRewardDate;

if (process.argv[2] == 'getFreeSpace') {
    nodes = (process.argv);
    nodes.shift();
    nodes.shift();
    nodes.shift();
    getFreeSpace(nodes);
} else if (process.argv[2] == 'createNodes') {
    createNodes(process.argv[3]);
} else if (process.argv[2] == 'getNode') {
    getNode(process.argv[3]);
} else if (process.argv[2] == 'r') {
    registerValidator();
} else if (process.argv[2] == 'nodeExitFull') {
    nodeExitFull(process.argv[3]);
} else if (process.argv[2] == 'nodeExit') {
    nodeExit(process.argv[3]);
} else if (process.argv[2] == 'changeReward') {
    changeReward(process.argv[3]);
} else if (process.argv[2] == 'getRotation') {
    getRotation(process.argv[3]);
} else if (process.argv[2] == 'getActiveNodeIPs') {
    getActiveNodeIPs(process.argv[3]);
} else if (process.argv[2] == 'getActiveNodeIds') {
    getActiveNodeIds(process.argv[3]);
} else if (process.argv[2] == 'nodesNameCheck') {
    nodesNameCheck(process.argv[3]);
} else if (process.argv[2] == 'nodesIpCheck') {
    nodesIpCheck(process.argv[3]);
} else if (process.argv[2] == 'checkPossibilityCreatingNode') {
    checkPossibilityCreatingNode(process.argv[3]);
} else if (process.argv[2] == 'getDelegationTotal') {
    getDelegationTotal(process.argv[3]);
} else if (process.argv[2] == 'setDelegationPeriod') {
    setDelegationPeriod();
} else if (process.argv[2] == 'getNodeAddress') {
    getNodeAddress(process.argv[3]);
} else if (process.argv[2] == 'getNodePublicKey') {
    getNodePublicKey(process.argv[3]);
} else if (process.argv[2] == 'makeNodeVisible') {
    makeNodeVisible(process.argv[3]);
} else if (process.argv[2] == 'getNumberOfNodes') {
    getNumberOfNodes();
}


async function createNode_legacy() {
	//let accounts = await web3.eth.getAccounts();
    console.log("OK");
    let name = await generateRandomName();
    console.log(name);
    let k = await init.Nodes.methods.nodesNameCheck(init.web3.utils.soliditySha3(name)).call();
    console.log(k);
    while (k) {
        name = await generateRandomName();
        k = await init.Nodes.methods.nodesNameCheck(init.web3.utils.soliditySha3(name)).call();
    }
    let data = await GenerateBytesData.generateBytesForNode(8545, await generateRandomIP(), init.mainAccount, name);
    console.log(data);
    let nonce = parseInt(data.slice(8, 12), 16);
    console.log(nonce);
	let deposit = 100000000000000000000;
    //console.log(init.SkaleToken);
	let accountDeposit = await init.SkaleToken.methods.balanceOf(init.mainAccount).call({from: init.mainAccount});
	console.log("Account: ", init.mainAccount);
	console.log("Data: ", data);
	console.log("Deposit:       ", deposit);
    console.log("Account Deposit", accountDeposit);
    //console.log(SkaleToken);
    //console.log(jsonData['skale_token_address']);
    //let registerValidator = await init.DelegationService.methods.registerValidator("ValidatorName", "Really good validator", 500, 100).send({from: init.mainAccount, gas: 6900000});
    //console.log(registerValidator);
    console.log("Validator Registered!");
    //let enableValidator = await init.ValidatorService.methods.enableValidator(1).send({from: init.mainAccount, gas: 6900000});
    //console.log(enableValidator);
    console.log("Validator Enabled!");
    //await init.Constants.methods.setMSR(100).send({from: init.mainAccount, gas: 6900000});
    //let delegated = await init.DelegationService.methods.delegate(1, 100, 3, "Nice").send({from: init.mainAccount, gas: 6900000});
    //console.log(delegated);
    console.log("Delegated!");
    //let accept = await init.DelegationService.methods.acceptPendingDelegation(0).send({from: init.mainAccount, gas: 6900000});
    //console.log(accept);
    console.log("Accepted!");
    // let skipped = await init.TokenState.methods.skipTransitionDelay(0).send({from: init.mainAccount, gas: 6900000});
    // console.log(skipped);
    console.log("Skipped!");
	let res = await init.SkaleManager.methods.createNode(data).send({from: init.mainAccount, gas: 6900000});
    console.log(res);
    /*let blockNumber = res.blockNumber;
    let nodeIndex;
    await init.NodesFunctionality.getPastEvents('NodeCreated', {fromBlock: blockNumber, toBlock: blockNumber}).then(
            function(events) {
                for (let i = 0; i < events.length; i++) {
                    if (events[i].returnValues['nonce'] == nonce) { 
                        nodeIndex = events[i].returnValues['nodeIndex'];
                    }
                }
            });
            
    await init.ValidatorsFunctionality.getPastEvents('Iterations', {fromBlock: blockNumber, toBlock: blockNumber}).then(
        function(events) {
            for (let i = 0; i < events.length; i++) {
                console.log(events[i].returnValues);
            }
        });
    console.log("Node", nodeIndex, "created with", res.gasUsed, "gas consumption");*/
    //return nodeIndex;
}


async function generateRandomIP() {
    let ip1 = Math.floor(Math.random() * 255);
    let ip2 = Math.floor(Math.random() * 255);
    let ip3 = Math.floor(Math.random() * 255);
    let ip4 = Math.floor(Math.random() * 255);
    return "" + ip1 + "." + ip2 + "." + ip3 + "." + ip4 + "";
}

async function generateRandomName() {
	let number = Math.floor(Math.random() * 100000);
	return "Node" + number;
}