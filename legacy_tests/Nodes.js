const init = require("./Init.js");
const GenerateBytesData = require("./GenerateBytesData.js");
//console.log(SkaleToken);

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
    let k = await init.NodesData.methods.nodesNameCheck(init.web3.utils.soliditySha3(name)).call();
    console.log(k);
    while (k) {
        name = await generateRandomName();
        k = await init.NodesData.methods.nodesCheckName(init.web3.utils.soliditySha3(name)).call();
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
	let res = await init.SkaleToken.methods.transfer(init.jsonData['skale_manager_address'], init.web3.utils.toBN(100000000000000000000).toString(), data).send({from: init.mainAccount, gas: 8000000});
    console.log(res);
    let blockNumber = res.blockNumber;
    let nodeIndex;
    await init.NodesFunctionality.getPastEvents('NodeCreated', {fromBlock: blockNumber, toBlock: blockNumber}).then(
            function(events) {
                for (let i = 0; i < events.length; i++) {
                    if (events[i].returnValues['nonce'] == nonce) { 
                        nodeIndex = events[i].returnValues['nodeIndex'];
                    }
                }
            });
    console.log("Node", nodeIndex, "created with", res.gasUsed, "gas consumption");
    return nodeIndex;
}

async function deleteNode(nodeIndex) {
    let res = await init.SkaleManager.methods.deleteNode(nodeIndex).send({from: init.mainAccount, gas: 4712388});
    console.log("Node:", nodeIndex, "deleted with", res.gasUsed, "gas consumption");
}

async function getNode(nodeIndex) {
    let res = await init.NodesData.methods.nodes(nodeIndex).call();
    console.log("Node index:", nodeIndex);
    console.log("Node name:", res.name);
    return res;
}

async function getNodeNextRewardDate(nodeIndex) {
    let res = await init.NodesData.methods.getNodeNextRewardDate(nodeIndex).call();
    return res;
}

async function createNodes(n) {
    let nodeIndexes = new Array(n);
    for (let i = 0; i < n; i++) {
        nodeIndexes[i] = await createNode();
    }
    return nodeIndexes;
}

//createNodes(15);

module.exports.createNode = createNode;
module.exports.createNodes = createNodes;
module.exports.getNode = getNode;
module.exports.deleteNode = deleteNode;
module.exports.getNodeNextRewardDate = getNodeNextRewardDate;
