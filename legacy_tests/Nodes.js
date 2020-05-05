const init = require("./Init.js");
const GenerateBytesData = require("./GenerateBytesData.js");

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


async function createNode() {
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
    let skipped = await init.TokenState.methods.skipTransitionDelay(0).send({from: init.mainAccount, gas: 6900000});
    console.log(skipped);
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

async function deleteNode(nodeIndex) {
    let res = await init.SkaleManager.methods.deleteNode(nodeIndex).send({from: init.mainAccount, gas: 6900000});
    console.log("Node:", nodeIndex, "deleted with", res.gasUsed, "gas consumption");
}

async function getNode(nodeIndex) {
    let res = await init.Nodes.methods.nodes(nodeIndex).call();
    console.log("Node index:", nodeIndex);
    console.log("Node name:", res.name);
    return res;
}

async function getNodeNextRewardDate(nodeIndex) {
    let res = await init.Nodes.methods.nodes(nodeIndex).call();
    console.log(res);
    let res1 = await init.Nodes.methods.getNodeNextRewardDate(nodeIndex).call();
    console.log(res1);
    console.log("Did everything!");
    return res;
}

async function createNodes(n) {
    let nodeIndexes = new Array(n);
    for (let i = 0; i < n; i++) {
        nodeIndexes[i] = await createNode();
    }
    return nodeIndexes;
}

//createNode();
getNodeNextRewardDate(0)

module.exports.createNode = createNode;
module.exports.createNodes = createNodes;
module.exports.getNode = getNode;
module.exports.deleteNode = deleteNode;
module.exports.getNodeNextRewardDate = getNodeNextRewardDate;
