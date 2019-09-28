const init = require("./Init.js");
const validators = require("./Validators.js");
const nodes = require("./Nodes.js");
const schains = require("./Schains.js");

let numberOfNodes = 0;

async function validationPart(nodeIndex) {
    let res = await validators.getValidatedArray(nodeIndex);
    console.log("Node", nodeIndex, "validate:");
    console.log(res.ids);
    for (let i = 0; i < res.ids.length; i++) {
        //console.log("Verdict time", res.times[i], "now", Math.floor(Date.now() / 1000));
        if (res.times[i] < Math.floor(Date.now() / 1000)) {
            console.log("Verdict will send from node", nodeIndex, "to node", i);
            await validators.sendVerdict(nodeIndex, res.ids[i], Math.floor(Math.random() * 300), Math.floor(Math.random() * 200));
        }
    }
    //console.log("Bounty time", await nodes.getNodeNextRewardDate(nodeIndex), "now", Math.floor(Date.now() / 1000));
    if (await nodes.getNodeNextRewardDate(nodeIndex) < Math.floor(Date.now() / 1000)) {
        console.log("Bounty requested for node", nodeIndex);
        console.log("Date of next reward", await nodes.getNodeNextRewardDate(nodeIndex), "and now", Math.floor(Date.now() / 1000));
        await validators.getBounty(nodeIndex);
        console.log("Validators for Node", nodeIndex);
        await validators.getValidatorsForNode(nodeIndex);
    }
}

async function validationForAllNodes() {
    //console.log(numberOfNodes);
    for (let i = 0; i < numberOfNodes; i++) {
        if (await init.NodesData.methods.isNodeActive(i)) {
            await validationPart(i);
            //await init.SchainsData.methods,getNodesInGroup()
        }
    }
    //setTimeout(function(){validationForAllNodes()}, 10000);
}

let allActiveNodes = new Array();
async function showActiveNodes(secondRandomNumber, rotated) {
    let schainsForNode = await init.SchainsData.methods.getSchainIdsForNode(secondRandomNumber).call();
    let activeFullNodes = await init.NodesData.methods.getActiveFullNodes().call();
    for (let i = 0; i < schainsForNode.length; i++) {
        let activeNodesInGroup = new Array();
        let nodesInGroup = await init.SchainsData.methods.getNodesInGroup(schainsForNode[i]).call();
        for (let j = 0; j < nodesInGroup.length; j++) {
            if (activeFullNodes.includes(nodesInGroup[j]) || nodesInGroup[j] == secondRandomNumber && !rotated) {
                process.stdout.write(nodesInGroup[j] + ' ');
                activeNodesInGroup.push(nodesInGroup[j]);
            }
        }
        allActiveNodes.push(activeNodesInGroup);
        console.log();
    }
}

async function rotationNode(secondRandomNumber) {
    console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>')
    await showActiveNodes(secondRandomNumber, false);
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
    let schainIds = await init.SchainsData.methods.getSchainIdsForNode(secondRandomNumber).call();
    let nodeRotated = new Array();
    for (let i = 0; i < schainIds.length; i++) {
        // await schainsFunctionality.replaceNode(schainIds[i]);
        let tx_hash = await init.SchainsFunctionality.methods.replaceNode(schainIds[i]).send({from: init.mainAccount, gas: 8000000});
        let blockNumber = tx_hash.blockNumber;
        await init.SchainsFunctionality.getPastEvents('NodeRotated', {fromBlock: blockNumber, toBlock: blockNumber}).then(
            function(events) {
                for (let i = 0; i < events.length; i++) {
                    // console.log(events[i].returnValues);
                    nodeRotated.push(events[i].returnValues.newNode);
                }
            });
    }
    await showActiveNodes(secondRandomNumber, true);

    for (let i = 0; i < allActiveNodes.length/2; i++) {
        if (!~allActiveNodes[i].indexOf(secondRandomNumber.toString())) {
            throw "Old node is not in schain";
        }
        if (allActiveNodes[i].length != 16) {
            throw "Schain length is not 16";
        }
    }
    let j = 0;

    for (let i = allActiveNodes.length/2; i < allActiveNodes.length; i++) {
        if (~allActiveNodes[i].indexOf(secondRandomNumber.toString())) {
            throw "Old node is still in schain";
        }
        if (allActiveNodes[i][allActiveNodes[i].length - 1] != nodeRotated[j++]) {
            throw "Node wasn't replaced by new one";
        }
        if (allActiveNodes[i].length != 16) {
            throw "Schain length is not 16";
        }
    }
    allActiveNodes = new Array();
    console.log('-----------------------------------------------------------------------------------------------')
}

async function rotationValidator(nodeIndex) {
    let res = await validators.getValidatedArray(nodeIndex);
    console.log("Node", nodeIndex, "will validate:");
    console.log(res.ids);
    for (index of res.ids) {
        let groupIndex = init.web3.utils.soliditySha3(index);
        let {logs} = await init.ValidatorsFunctionality.rotateNode(groupIndex).send({from: init.mainAccount, gas: 8000000});
        console.log(logs);
    }  
}

let n = 1;
async function main(numberOfIterations) {

    //let nodeIndex = await nodes.createNode();
    // let randomNumber = Math.floor(Math.random() * 10) + 80;
    let randomNumber = 100;
    //console.log("Part of creating Nodes!");
    for (let i = 0; i < randomNumber; i++) {
        nodeIndex = await nodes.createNode();
        await nodes.getNode(nodeIndex);
        numberOfNodes++;
    }

    let schainName;
    for (let i = 0; i < 5; i++) {
        schainName = await schains.createSchain(3, 94867200);
        console.log("Schain name:", schainName);
        await schains.getSchainNodes(schainName); 
    }

    // randomNumber = Math.floor(Math.random() * 20);
    let iter = 0;
    while (iter < 40) {
        let secondRandomNumber = Math.floor(Math.random() * numberOfNodes);
        let schainIds = await init.SchainsData.methods.getSchainIdsForNode(secondRandomNumber).call();
        if (await init.NodesData.methods.isNodeActive(secondRandomNumber).call() && schainIds.length) {
            console.log("Delete node", secondRandomNumber);
            await rotationValidator(secondRandomNumber);
            await nodes.deleteNode(secondRandomNumber);
            await rotationNode(secondRandomNumber);
        } else {
            continue;
        }
        iter++;
    }
    numberOfIterations++;
    await main(numberOfIterations);
    /*
    await validationForAllNodes();
    console.log("Date of next reward", await nodes.getNodeNextRewardDate(6), "and now", Math.floor(Date.now() / 1000));
    await validators.getBounty(6);
    console.log("Validators for Node", 6);
    await validators.getValidatorsForNode(6);*/

    // console.log(numberOfIterations);
    // if (numberOfIterations < 20) {
    //     numberOfIterations++;
    //     await setTimeout(function(){main(numberOfIterations)}, 10000);
    // } else {
    //     process.exit();
    // }
}

//console.log("Start!!");
main(n);
