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
let n = 0;
async function main(numberOfIterations) {

    //let nodeIndex = await nodes.createNode();
    let randomNumber = Math.floor(Math.random() * 10) + 20;
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
        //await schains.getSchainsForNode(0);

        //console.log("Part of Node", await schains.getSchainPartOfNode(schainName));
        //await schains.deleteSchain(schainName);
    }

    randomNumber = Math.floor(Math.random() * 5);

    for (let i = 0; i < randomNumber; i++) {
        let secondRandomNumber = Math.floor(Math.random() * numberOfNodes);
        if (await init.NodesData.methods.isNodeActive(secondRandomNumber)) {
            console.log("Delete node", secondRandomNumber);
            await nodes.deleteNode(secondRandomNumber);
        }
    }

    await validationForAllNodes();/*
    console.log("Date of next reward", await nodes.getNodeNextRewardDate(6), "and now", Math.floor(Date.now() / 1000));
    await validators.getBounty(6);
    console.log("Validators for Node", 6);
    await validators.getValidatorsForNode(6);*/

    console.log(numberOfIterations);
    if (numberOfIterations < 20) {
        numberOfIterations++;
        await setTimeout(function(){main(numberOfIterations)}, 10000);
    } else {
        process.exit();
    }
}

//console.log("Start!!");
main(n);
