const init = require("./Init.js");

async function sendVerdict(fromNodeIndex, toNodeIndex, downtime, latency) {
    let res = await init.SkaleManager.methods.sendVerdict(fromNodeIndex, toNodeIndex, downtime, latency).send({from: init.mainAccount, gas: 4712388});
    console.log("Verdict (", downtime, ",", latency, ") was sent from", fromNodeIndex, "to", toNodeIndex);
}

async function getBounty(nodeIndex) {
    let res = await init.SkaleManager.methods.getBounty(nodeIndex).send({from: init.mainAccount, gas: 6900000});
    let amount;
    await init.SkaleManager.getPastEvents('BountyReceived', {fromBlock: res.blockNumber, toBlock: res.blockNumber}).then(
            function(events) {
                for (let i = 0; i < events.length; i++) {
                    if (events[i].returnValues['nodeIndex'] == nodeIndex) {
                        amount = events[i].returnValues['bounty'];
                    }
                }
            });
    console.log("Node", nodeIndex, "got", amount, "* 10 ^ (-18) SKL");
}

async function getMonitorsForNode(nodeIndex) {
    let res = await init.Monitors.methods.getNodesInGroup(init.web3.utils.soliditySha3(nodeIndex)).call();
    console.log("Node index:", nodeIndex);
    console.log("Monitors for this Node", res);
    return res;
}

async function getValidatedArray(nodeIndex) {
    let res = await init.Monitors.methods.getValidatedArray(init.web3.utils.soliditySha3(nodeIndex)).call();
    let result = {
        ids: new Array(res.length),
        times: new Array(res.length)
    }
    for (let i = 0; i < res.length; i++) {
        result.ids[i] = parseInt(res[i].slice(2, 30), 16);
        result.times[i] = parseInt(res[i].slice(30, 58), 16);
    }
    return result;
}

module.exports.sendVerdict = sendVerdict;
module.exports.getBounty = getBounty;
module.exports.getMonitorsForNode = getMonitorsForNode;
module.exports.getValidatedArray = getValidatedArray;
