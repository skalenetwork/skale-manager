import { BigNumber } from "bignumber.js";
import { ConstantsHolderInstance,
         ContractManagerInstance,
         MonitorsDataContract,
         MonitorsDataInstance,
         MonitorsFunctionalityContract,
         MonitorsFunctionalityInstance,
         NodesDataContract,
         NodesDataInstance,
         NodesFunctionalityInstance,
         SkaleDKGContract,
         SkaleDKGInstance } from "../types/truffle-contracts";
import { gasMultiplier } from "./utils/command_line";
import { currentTime, skipTime } from "./utils/time";

import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "./utils/deploy/constantsHolder";
import { deployContractManager } from "./utils/deploy/contractManager";
import { deployNodesData } from "./utils/deploy/nodesData";
import { deployNodesFunctionality } from "./utils/deploy/nodesFunctionality";
chai.should();
chai.use((chaiAsPromised));

const MonitorsFunctionality: MonitorsFunctionalityContract = artifacts.require("./MonitorsFunctionality");
const MonitorsData: MonitorsDataContract = artifacts.require("./MonitorsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

contract("MonitorsFunctionality", ([owner, validator]) => {
  let contractManager: ContractManagerInstance;
  let monitorsFunctionality: MonitorsFunctionalityInstance;
  let constantsHolder: ConstantsHolderInstance;
  let monitorsData: MonitorsDataInstance;
  let nodesData: NodesDataInstance;
  let nodesFunctionality: NodesFunctionalityInstance;
  let skaleDKG: SkaleDKGInstance;

  beforeEach(async () => {
    contractManager = await deployContractManager();

    monitorsFunctionality = await MonitorsFunctionality.new(
      "SkaleManager", "MonitorsData",
      contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("MonitorsFunctionality", monitorsFunctionality.address);

    monitorsData = await MonitorsData.new(
      "MonitorsFunctionality",
      contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("MonitorsData", monitorsData.address);

    nodesData = await deployNodesData(contractManager);

    constantsHolder = await deployConstantsHolder(contractManager);
    nodesFunctionality = await deployNodesFunctionality(contractManager);

    skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

    // create a node for monitors functions tests
    await nodesData.addNode(validator, "elvis1", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
    await nodesData.addNode(validator, "elvis2", "0x7f000003", "0x7f000004", 8545, "0x1122334456", 0);
    await nodesData.addNode(validator, "elvis3", "0x7f000005", "0x7f000006", 8545, "0x1122334457", 0);
    await nodesData.addNode(validator, "elvis4", "0x7f000007", "0x7f000008", 8545, "0x1122334458", 0);
    await nodesData.addNode(validator, "elvis5", "0x7f000009", "0x7f000010", 8545, "0x1122334459", 0);
  });
  // nodeIndex = 0 because we add one node and her index in array is 0
  const nodeIndex = 0;

  it("should add Monitor", async () => {
    const { logs } = await monitorsFunctionality.addMonitor(nodeIndex, {from: owner});
    // check events after `.addMonitor` invoke
    assert.equal(logs[0].event, "GroupAdded");
    assert.equal(logs[1].event, "GroupGenerated");
    assert.equal(logs[2].event, "MonitorsArray");
    assert.equal(logs[3].event, "MonitorCreated");

    const targetNodes = logs[2].args[2].map((value: BN) => value.toNumber());
    targetNodes.sort();
    targetNodes.forEach((value: number, index: number) => {
      if (index > 0) {
        assert.notEqual(value, targetNodes[index - 1], "Array should not contain duplicates");
      }
      assert(nodesData.isNodeActive(value), "Node should be active");
    });
  });

  it("should upgrade Monitor", async () => {
    // add monitor
    await monitorsFunctionality.addMonitor(nodeIndex, {from: owner});
    // upgrade Monitor
    const { logs } = await monitorsFunctionality.upgradeMonitor(nodeIndex, {from: owner});
    // check events after `.upgradeMonitor` invoke
    assert.equal(logs[0].event, "GroupUpgraded");
    assert.equal(logs[1].event, "GroupGenerated");
    assert.equal(logs[2].event, "MonitorsArray");
    assert.equal(logs[3].event, "MonitorUpgraded");
  });

  it("should send Verdict", async () => {
    // preparation
    // ip = 127.0.0.1
    const ipToHex = "7f000001";
    const indexNode0 = 0;
    const indexNode0inSha3 = web3.utils.soliditySha3(indexNode0);
    const indexNode1 = 1;
    const indexNode1ToHex = ("0000000000000000000000000000000000" +
        indexNode1).slice(-28);
    const timeInSec = 1;
    const timeToHex = ("0000000000000000000000000000000000" +
        timeInSec).slice(-28);
    const data32bytes = "0x" + indexNode1ToHex + timeToHex + ipToHex;
    //
    await monitorsFunctionality.addMonitor(indexNode0, {from: owner});
    //
    await monitorsData.addCheckedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    // execution
    const { logs } = await monitorsFunctionality
          .sendVerdict(0, indexNode1, 1, 0, {from: owner});
    // assertion
    assert.equal(logs[0].event, "VerdictWasSent");
  });

  it("should rejected with `Checked Node...` error when invoke sendVerdict", async () => {
    const error = "Checked Node does not exist in MonitorsArray";
    await monitorsFunctionality
          .sendVerdict(0, 1, 0, 0, {from: owner})
          .should.be.eventually.rejectedWith(error);
  });

  it("should rejected with `The time has...` error when invoke sendVerdict", async () => {
    const error = "The time has not come to send verdict";
    // preparation
    // ip = 127.0.0.1
    const ipToHex = "7f000001";
    const indexNode0 = 0;
    const indexNode0inSha3 = web3.utils.soliditySha3(indexNode0);
    const indexNode1 = 1;
    const indexNode1ToHex = ("0000000000000000000000000000000000" +
        indexNode1).slice(-28);
    const time = await currentTime(web3) + 100;
    const timeInHex = time.toString(16);
    const add0ToHex = ("00000000000000000000000000000" +
    timeInHex).slice(-28);
    // for data32bytes should revert to hex indexNode1 + oneSec + 127.0.0.1
    const data32bytes = "0x" + indexNode1ToHex + add0ToHex + ipToHex;
    //
    // await monitorsFunctionality.addMonitor(indexNode0, {from: owner});
    //
    await monitorsData.addCheckedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    await monitorsFunctionality
          .sendVerdict(0, 1, 0, 0, {from: owner})
          .should.be.eventually.rejectedWith(error);
  });

  it("should calculate Metrics", async () => {
    // preparation
    const indexNode1 = 1;
    const monitorIndex1 = web3.utils.soliditySha3(indexNode1);
    await monitorsData.addGroup(
      monitorIndex1, 1, "0x0000000000000000000000000000000000000000000000000000000000000000", {from: owner},
      );
    await monitorsData.setNodeInGroup(
      monitorIndex1, indexNode1, {from: owner},
      );
    await monitorsData.addVerdict(monitorIndex1, 10, 0, {from: owner});
    await monitorsData.addVerdict(monitorIndex1, 10, 50, {from: owner});
    await monitorsData.addVerdict(monitorIndex1, 100, 40, {from: owner});
    const res = new BigNumber(await monitorsData.getLengthOfMetrics(monitorIndex1, {from: owner}));
    expect(parseInt(res.toString(), 10)).to.equal(3);

    const metrics = await await monitorsFunctionality.calculateMetrics.call(indexNode1, {from: owner});
    const downtime = web3.utils.toBN(metrics[0]).toNumber();
    const latency = web3.utils.toBN(metrics[1]).toNumber();
    downtime.should.be.equal(10);
    latency.should.be.equal(40);

    // execution
    await monitorsFunctionality
          .calculateMetrics(indexNode1, {from: owner});
    const res2 = new BigNumber(await monitorsData.getLengthOfMetrics(monitorIndex1, {from: owner}));
    // expectation
    expect(parseInt(res2.toString(), 10)).to.equal(0);
  });

  it("should add verdict when sendVerdict invoke", async () => {
    // preparation
    // ip = 127.0.0.1
    const ipToHex = "7f000001";
    const indexNode0 = 0;
    const indexNode0inSha3 = web3.utils.soliditySha3(indexNode0);
    const indexNode1 = 1;
    const monitorIndex1 = web3.utils.soliditySha3(indexNode1);
    const indexNode1ToHex = ("0000000000000000000000000000000000" +
        indexNode1).slice(-28);
    const time = await currentTime(web3);
    const timeInHex = time.toString(16);
    const add0ToHex = ("00000000000000000000000000000" +
    timeInHex).slice(-28);
    const data32bytes = "0x" + indexNode1ToHex + add0ToHex + ipToHex;
    //
    await monitorsData.addCheckedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    // execution
    // skipTime(web3, time - 200);
    await monitorsFunctionality
          .sendVerdict(0, 1, 0, 0, {from: owner});
    const res = new BigNumber(await monitorsData.getLengthOfMetrics(monitorIndex1, {from: owner}));
    // expectation
    expect(parseInt(res.toString(), 10)).to.equal(1);
  });

  it("should rotate node in monitor groups", async () => {
    for (let i = 0; i < 5; i++) {
      await nodesData.addNode(validator, "d" + i, "0x7f00000" + i, "0x7f00000" + (i + 1), 8545, "0x1122334455", 0);
    }
    const firstNode = 0;
    const secondNode = 1;
    await monitorsFunctionality.addMonitor(firstNode);
    await monitorsFunctionality.addMonitor(secondNode);
    const groupIndex0 = web3.utils.soliditySha3(firstNode);
    const groupIndex1 = web3.utils.soliditySha3(secondNode);
    await nodesData.addNode(validator, "vadim", "0x7f000009", "0x7f000010", 8545, "0x1122334459", 0);
    await nodesFunctionality.removeNodeByRoot(3);
    {
      const activeNodes = [];
      const {logs} = await monitorsFunctionality.rotateNode(groupIndex0);
      const monitors = await monitorsData.getNodesInGroup(groupIndex0);
      for (const node of monitors) {
        if (await nodesData.isNodeActive(node)) {
          activeNodes.push(node.toNumber());
        }
      }
      activeNodes.indexOf(firstNode).should.be.equal(-1);
      activeNodes[activeNodes.length - 1].should.be.equal(logs[0].args.newNode.toNumber());
    }
    {
      const activeNodes = [];
      const {logs} = await monitorsFunctionality.rotateNode(groupIndex1);
      const monitors = await monitorsData.getNodesInGroup(groupIndex1);
      for (const node of monitors) {
        if (await nodesData.isNodeActive(node)) {
          activeNodes.push(node.toNumber());
        }
      }
      activeNodes.indexOf(secondNode).should.be.equal(-1);
      activeNodes[activeNodes.length - 1].should.be.equal(logs[0].args.newNode.toNumber());
    }
  });

  it("should not contain duplicates after epoch ending", async () => {
    await monitorsFunctionality.addMonitor(0);

    const rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
    skipTime(web3, rewardPeriod);

    await monitorsFunctionality.sendVerdict(1, 0, 0, 0);

    const node1Hash = web3.utils.soliditySha3(1);
    const node2Hash = web3.utils.soliditySha3(2);
    await monitorsData.getCheckedArray(node1Hash).should.be.eventually.empty;
    (await monitorsData.getCheckedArray(node2Hash)).length.should.be.equal(1);

    await nodesData.changeNodeLastRewardDate(0);
    await monitorsFunctionality.upgradeMonitor(0);

    const validatedArray = await monitorsData.getCheckedArray(node2Hash);
    const validatedNodeIndexes = validatedArray.map((value) => value.slice(2, 2 + 14 * 2)).map(Number);

    validatedNodeIndexes.sort();
    validatedNodeIndexes.forEach((value: number, index: number, array: number[]) => {
      if (index > 0) {
        assert.notDeepEqual(value, array[index - 1], "Should not contain duplicates");
      }
    });
  });

  const nodesCount = 50;
  const activeNodesCount = 30;
  describe("when " + nodesCount + " nodes in network", async () => {

    beforeEach(async () => {
      for (let node = (await nodesData.getNumberOfNodes()).toNumber(); node < nodesCount; ++node) {
        const address = ("0000" + node.toString(16)).slice(-4);

        await nodesData.addNode(validator,
                                "d2_" + node,
                                "0x7f" + address + "01",
                                "0x7f" + address + "02",
                                8545,
                                "0x1122334459",
                                0);
      }

      const leavingCount = nodesCount - activeNodesCount;
      for (let i = 0; i < leavingCount; ++i) {
        await nodesData.setNodeLeaving(Math.floor(i * nodesCount / leavingCount));
      }
    });

    it("should add monitor", async () => {
      for (let node = 0; node < nodesCount; ++node) {
        if (await nodesData.isNodeActive(node)) {
          const { logs } = await monitorsFunctionality.addMonitor(node);

          const targetNodes = logs[2].args[2].map((value: BN) => value.toNumber());
          targetNodes.length.should.be.equal(24);
          targetNodes.sort();
          targetNodes.forEach((value: number, index: number) => {
            if (index > 0) {
              assert.notEqual(value, targetNodes[index - 1], "Array should not contain duplicates");
            }
            assert(nodesData.isNodeActive(value), "Node should be active");
          });
        }
      }
    });
  });

});
