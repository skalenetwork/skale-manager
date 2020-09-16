const init = require("./Init.js");

const GenerateBytesData = require("./GenerateBytesData.js");

function generateRandomName() {
	let number = Math.floor(Math.random() * 100000);
	return "Schain" + number;
}

async function createSchain(typeOfSchain, lifetime) {
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

async function deleteSchain(schainName) {
    let res = await init.SkaleManager.methods.deleteSchain(schainName).send({from: init.mainAccount, gas: 4712388});
    console.log("Schain", schainName, "deleted with", res.gasUsed);
}

async function getSchain(schainName) {
    let res = await init.SchainsInternal.methods.schains(init.web3.utils.soliditySha3(schainName)).call();
    console.log(res);
    return res;
}

async function getSchainNodes(schainName) {
    let res = await init.SchainsInternal.methods.getNodesInGroup(init.web3.utils.soliditySha3(schainName)).call();
    console.log("Schain name:", schainName);
    console.log("Nodes in Schain", res);
    return res;
}

async function getSchainsForNode(nodeIndex) {
    let res = await init.SchainsInternal.methods.getSchainIdsForNode(nodeIndex).call();
    console.log(res);
    let res1;
    for (let i = 0; i < res.length; i++) {
        res1 = await init.SchainsInternal.methods.schains(res[i]).call();
        console.log(res1);
    }
    return res;
}

//createSchain(4, 94867200);

module.exports.createSchain = createSchain;
module.exports.deleteSchain = deleteSchain;
module.exports.getSchain = getSchain;
module.exports.getSchainNodes = getSchainNodes;
module.exports.getSchainsForNode = getSchainsForNode;
