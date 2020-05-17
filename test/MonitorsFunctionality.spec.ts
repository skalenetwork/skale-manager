import { BigNumber } from "bignumber.js";
import { ConstantsHolderInstance,
         ContractManagerInstance,
         MonitorsInstance,
        NodesInstance } from "../types/truffle-contracts";

import { currentTime, skipTime } from "./tools/time";

import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployMonitors } from "./tools/deploy/monitors";
import { deployNodes } from "./tools/deploy/nodes";
chai.should();
chai.use((chaiAsPromised));

contract("MonitorsFunctionality", ([owner, validator]) => {
  let contractManager: ContractManagerInstance;
  let constantsHolder: ConstantsHolderInstance;
  let monitors: MonitorsInstance;
  let nodes: NodesInstance;

  beforeEach(async () => {
    contractManager = await deployContractManager();

    nodes = await deployNodes(contractManager);
    monitors = await deployMonitors(contractManager);
    constantsHolder = await deployConstantsHolder(contractManager);

    // create a node for monitors functions tests
    await nodes.addNode(validator, "elvis1", "0x7f000001", "0x7f000002", 8545, "0x1122334455", 0);
    await nodes.addNode(validator, "elvis2", "0x7f000003", "0x7f000004", 8545, "0x1122334456", 0);
    await nodes.addNode(validator, "elvis3", "0x7f000005", "0x7f000006", 8545, "0x1122334457", 0);
    await nodes.addNode(validator, "elvis4", "0x7f000007", "0x7f000008", 8545, "0x1122334458", 0);
    await nodes.addNode(validator, "elvis5", "0x7f000009", "0x7f000010", 8545, "0x1122334459", 0);
  });
  // nodeIndex = 0 because we add one node and her index in array is 0
  const nodeIndex = 0;

  it("should add Monitor", async () => {
    const { logs } = await monitors.addMonitor(nodeIndex, {from: owner});
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
      assert(nodes.isNodeActive(value), "Node should be active");
    });
  });

  it("should upgrade Monitor", async () => {
    // add monitor
    await monitors.addMonitor(nodeIndex, {from: owner});
    // upgrade Monitor
    const { logs } = await monitors.upgradeMonitor(nodeIndex, {from: owner});
    // check events after `.upgradeMonitor` invoke
    assert.equal(logs[0].event, "GroupUpgraded");
    assert.equal(logs[1].event, "GroupGenerated");
    assert.equal(logs[2].event, "MonitorsArray");
    assert.equal(logs[3].event, "MonitorUpgraded");
  });

  it("should rejected with `Checked Node...` error when invoke sendVerdict", async () => {
    const error = "Checked Node does not exist in MonitorsArray";
    const verd = {
      toNodeIndex: 1,
      downtime: 0,
      latency: 0,
    };
    await monitors
          .sendVerdict(0, verd, {from: owner})
          .should.be.eventually.rejectedWith(error);
  });

  it("should not contain duplicates after epoch ending", async () => {
    await monitors.addMonitor(0);

    const rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
    skipTime(web3, rewardPeriod);

    const verd = {
      toNodeIndex: 0,
      downtime: 0,
      latency: 0,
    };
    await monitors.sendVerdict(1, verd);

    const node1Hash = web3.utils.soliditySha3(1);
    const node2Hash = web3.utils.soliditySha3(2);
    await monitors.getCheckedArray(node1Hash).should.be.eventually.empty;
    (await monitors.getCheckedArray(node2Hash)).length.should.be.equal(1);

    await nodes.changeNodeLastRewardDate(0);
    await monitors.upgradeMonitor(0);

    const validatedArray = await monitors.getCheckedArray(node2Hash);
    const validatedNodeIndexes = validatedArray.map((value) => value.slice(2, 2 + 14 * 2)).map(Number);
    validatedNodeIndexes.sort();
    validatedNodeIndexes.forEach((value: number, index: number, array: number[]) => {
      if (index > 0) {
        assert.notDeepEqual(value, array[index - 1], "Should not contain duplicates");
      }
    });
  });

  it("should delete node from checked list", async () => {
    await monitors.addMonitor(0);

    const node1Hash = web3.utils.soliditySha3(1);
    const node2Hash = web3.utils.soliditySha3(2);
    const node3Hash = web3.utils.soliditySha3(3);
    const node4Hash = web3.utils.soliditySha3(4);

    (await monitors.getCheckedArray(node1Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node2Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node3Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node4Hash)).length.should.be.equal(1);

    await monitors.deleteMonitor(0);

    await monitors.getCheckedArray(node1Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node2Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node3Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node4Hash).should.be.eventually.empty;
  });

  it("should delete nodes from checked list", async () => {
    await monitors.addMonitor(0);
    await monitors.addMonitor(1);

    const node0Hash = web3.utils.soliditySha3(0);
    const node1Hash = web3.utils.soliditySha3(1);
    const node2Hash = web3.utils.soliditySha3(2);
    const node3Hash = web3.utils.soliditySha3(3);
    const node4Hash = web3.utils.soliditySha3(4);

    (await monitors.getCheckedArray(node0Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node1Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node2Hash)).length.should.be.equal(2);
    (await monitors.getCheckedArray(node3Hash)).length.should.be.equal(2);
    (await monitors.getCheckedArray(node4Hash)).length.should.be.equal(2);

    await monitors.deleteMonitor(0);

    await monitors.getCheckedArray(node0Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node1Hash).should.be.eventually.empty;
    (await monitors.getCheckedArray(node2Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node3Hash)).length.should.be.equal(1);
    (await monitors.getCheckedArray(node4Hash)).length.should.be.equal(1);

    await monitors.deleteMonitor(1);

    await monitors.getCheckedArray(node0Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node1Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node2Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node3Hash).should.be.eventually.empty;
    await monitors.getCheckedArray(node4Hash).should.be.eventually.empty;
  });

  const nodesCount = 50;
  const activeNodesCount = 30;
  describe("when " + nodesCount + " nodes in network", async () => {

    beforeEach(async () => {
      for (let node = (await nodes.getNumberOfNodes()).toNumber(); node < nodesCount; ++node) {
        const address = ("0000" + node.toString(16)).slice(-4);

        await nodes.addNode(validator,
                                "d2_" + node,
                                "0x7f" + address + "01",
                                "0x7f" + address + "02",
                                8545,
                                "0x1122334459",
                                0);
      }

      const leavingCount = nodesCount - activeNodesCount;
      for (let i = 0; i < leavingCount; ++i) {
        await nodes.setNodeLeaving(Math.floor(i * nodesCount / leavingCount));
      }
    });

    it("should add monitor", async () => {
      for (let node = 0; node < nodesCount; ++node) {
        if (await nodes.isNodeActive(node)) {
          const { logs } = await monitors.addMonitor(node);

          const targetNodes = logs[2].args[2].map((value: BN) => value.toNumber());
          targetNodes.length.should.be.equal(24);
          targetNodes.sort();
          targetNodes.forEach(async (value: number, index: number) => {
            if (index > 0) {
              assert.notEqual(value, targetNodes[index - 1], "Array should not contain duplicates");
            }
            assert(await nodes.isNodeActive(value), "Node should be active");
          });
        }
      }
    });
  });

});
