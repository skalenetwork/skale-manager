import { BigNumber } from "bignumber.js";
import {
        ConstantsHolderContract,
        ConstantsHolderInstance,
        ContractManagerContract,
        ContractManagerInstance,
        NodesDataContract,
        NodesDataInstance,
        NodesFunctionalityContract,
        NodesFunctionalityInstance,
        SkaleDKGContract,
        SkaleDKGInstance,
        ValidatorsDataContract,
        ValidatorsDataInstance,
        ValidatorsFunctionalityContract,
        ValidatorsFunctionalityInstance} from "../types/truffle-contracts";
import { gasMultiplier } from "./utils/command_line";
import { currentTime, skipTime } from "./utils/time";

import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { type } from "os";
chai.should();
chai.use((chaiAsPromised));

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const ValidatorsFunctionality: ValidatorsFunctionalityContract = artifacts.require("./ValidatorsFunctionality");
const ConstantsHolder: ConstantsHolderContract = artifacts.require("./ConstantsHolder");
const ValidatorsData: ValidatorsDataContract = artifacts.require("./ValidatorsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const NodesFunctionality: NodesFunctionalityContract = artifacts.require("./NodesFunctionality");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

contract("ValidatorsFunctionality", ([owner, validator]) => {
  let contractManager: ContractManagerInstance;
  let validatorsFunctionality: ValidatorsFunctionalityInstance;
  let constantsHolder: ConstantsHolderInstance;
  let validatorsData: ValidatorsDataInstance;
  let nodesData: NodesDataInstance;
  let nodesFunctionality: NodesFunctionalityInstance;
  let skaleDKG: SkaleDKGInstance;

  beforeEach(async () => {
    contractManager = await ContractManager.new({from: owner});

    validatorsFunctionality = await ValidatorsFunctionality.new(
      "SkaleManager", "ValidatorsData",
      contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("ValidatorsFunctionality", validatorsFunctionality.address);

    validatorsData = await ValidatorsData.new(
      "ValidatorsFunctionality",
      contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("ValidatorsData", validatorsData.address);

    constantsHolder = await ConstantsHolder.new(
      contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("Constants", constantsHolder.address);

    nodesData = await NodesData.new(
        5260000,
        contractManager.address,
        {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("NodesData", nodesData.address);

    nodesFunctionality = await NodesFunctionality.new(
      contractManager.address,
      {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("NodesFunctionality", nodesFunctionality.address);

    skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
    await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

    // create a node for validators functions tests
    await nodesData.addNode(validator, "elvis1", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
    await nodesData.addNode(validator, "elvis2", "0x7f000003", "0x7f000004", 8545, "0x1122334456");
    await nodesData.addNode(validator, "elvis3", "0x7f000005", "0x7f000006", 8545, "0x1122334457");
    await nodesData.addNode(validator, "elvis4", "0x7f000007", "0x7f000008", 8545, "0x1122334458");
    await nodesData.addNode(validator, "elvis5", "0x7f000009", "0x7f000010", 8545, "0x1122334459");
  });
  // nodeIndex = 0 because we add one node and her index in array is 0
  const nodeIndex = 0;

  it("should add Validator", async () => {
    const { logs } = await validatorsFunctionality.addValidator(nodeIndex, {from: owner});
    // check events after `.addValidator` invoke
    assert.equal(logs[0].event, "GroupAdded");
    assert.equal(logs[1].event, "GroupGenerated");
    assert.equal(logs[2].event, "ValidatorsArray");
    assert.equal(logs[3].event, "ValidatorCreated");

    const targetNodes = logs[2].args[2].map((value: BN) => value.toNumber());
    targetNodes.sort();
    targetNodes.forEach((value: number, index: number) => {
      if (index > 0) {
        assert.notEqual(value, targetNodes[index - 1], "Array should not contain duplicates");
      }
      assert(nodesData.isNodeActive(value), "Node should be active");
    });
  });

  it("should upgrade Validator", async () => {
    // add validator
    await validatorsFunctionality.addValidator(nodeIndex, {from: owner});
    // upgrade Validator
    const { logs } = await validatorsFunctionality.upgradeValidator(nodeIndex, {from: owner});
    // check events after `.upgradeValidator` invoke
    assert.equal(logs[0].event, "GroupUpgraded");
    assert.equal(logs[1].event, "GroupGenerated");
    assert.equal(logs[2].event, "ValidatorsArray");
    assert.equal(logs[3].event, "ValidatorUpgraded");
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
    await validatorsFunctionality.addValidator(indexNode0, {from: owner});
    //
    await validatorsData.addValidatedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    // execution
    const { logs } = await validatorsFunctionality
          .sendVerdict(0, indexNode1, 1, 0, {from: owner});
    // assertation
    assert.equal(logs[0].event, "VerdictWasSent");
  });

  it("should rejected with `Validated Node...` error when invoke sendVerdict", async () => {
    const error = "Validated Node does not exist in ValidatorsArray";
    await validatorsFunctionality
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
    // await validatorsFunctionality.addValidator(indexNode0, {from: owner});
    //
    await validatorsData.addValidatedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    await validatorsFunctionality
          .sendVerdict(0, 1, 0, 0, {from: owner})
          .should.be.eventually.rejectedWith(error);
  });

  it("should calculate Metrics", async () => {
    // preparation
    const indexNode1 = 1;
    const validatorIndex1 = web3.utils.soliditySha3(indexNode1);
    await validatorsData.addGroup(
      validatorIndex1, 1, "0x0000000000000000000000000000000000000000000000000000000000000000", {from: owner},
      );
    await validatorsData.setNodeInGroup(
      validatorIndex1, indexNode1, {from: owner},
      );
    await validatorsData.addVerdict(validatorIndex1, 10, 0, {from: owner});
    await validatorsData.addVerdict(validatorIndex1, 10, 50, {from: owner});
    await validatorsData.addVerdict(validatorIndex1, 100, 40, {from: owner});
    const res = new BigNumber(await validatorsData.getLengthOfMetrics(validatorIndex1, {from: owner}));
    expect(parseInt(res.toString(), 10)).to.equal(3);

    const metrics = await await validatorsFunctionality.calculateMetrics.call(indexNode1, {from: owner});
    const downtime = web3.utils.toBN(metrics[0]).toNumber();
    const latency = web3.utils.toBN(metrics[1]).toNumber();
    downtime.should.be.equal(10);
    latency.should.be.equal(40);

    // execution
    await validatorsFunctionality
          .calculateMetrics(indexNode1, {from: owner});
    const res2 = new BigNumber(await validatorsData.getLengthOfMetrics(validatorIndex1, {from: owner}));
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
    const validatorIndex1 = web3.utils.soliditySha3(indexNode1);
    const indexNode1ToHex = ("0000000000000000000000000000000000" +
        indexNode1).slice(-28);
    const time = await currentTime(web3);
    const timeInHex = time.toString(16);
    const add0ToHex = ("00000000000000000000000000000" +
    timeInHex).slice(-28);
    const data32bytes = "0x" + indexNode1ToHex + add0ToHex + ipToHex;
    //
    await validatorsData.addValidatedNode(
      indexNode0inSha3, data32bytes, {from: owner},
      );
    // execution
    // skipTime(web3, time - 200);
    await validatorsFunctionality
          .sendVerdict(0, 1, 0, 0, {from: owner});
    const res = new BigNumber(await validatorsData.getLengthOfMetrics(validatorIndex1, {from: owner}));
    // expectation
    expect(parseInt(res.toString(), 10)).to.equal(1);
  });

  it("should rotate node in validator groups", async () => {
    for (let i = 0; i < 5; i++) {
      await nodesData.addNode(validator, "d" + i, "0x7f00000" + i, "0x7f00000" + (i + 1), 8545, "0x1122334455");
    }
    const firstNode = 0;
    const secondNode = 1;
    await validatorsFunctionality.addValidator(firstNode);
    await validatorsFunctionality.addValidator(secondNode);
    const groupIndex0 = web3.utils.soliditySha3(firstNode);
    const groupIndex1 = web3.utils.soliditySha3(secondNode);
    await nodesData.addNode(validator, "vadim", "0x7f000009", "0x7f000010", 8545, "0x1122334459");
    await nodesFunctionality.removeNodeByRoot(3);
    {
      const activeNodes = [];
      const {logs} = await validatorsFunctionality.rotateNode(groupIndex0);
      const validators = await validatorsData.getNodesInGroup(groupIndex0);
      for (const node of validators) {
        if (await nodesData.isNodeActive(node)) {
          activeNodes.push(node.toNumber());
        }
      }
      activeNodes.indexOf(firstNode).should.be.equal(-1);
      activeNodes[activeNodes.length - 1].should.be.equal(logs[0].args.newNode.toNumber());
    }
    {
      const activeNodes = [];
      const {logs} = await validatorsFunctionality.rotateNode(groupIndex1);
      const validators = await validatorsData.getNodesInGroup(groupIndex1);
      for (const node of validators) {
        if (await nodesData.isNodeActive(node)) {
          activeNodes.push(node.toNumber());
        }
      }
      activeNodes.indexOf(secondNode).should.be.equal(-1);
      activeNodes[activeNodes.length - 1].should.be.equal(logs[0].args.newNode.toNumber());
    }
  });

  it("should not contain duplicates after epoch ending", async () => {
    await validatorsFunctionality.addValidator(0);

    const rewardPeriod = (await constantsHolder.rewardPeriod()).toNumber();
    skipTime(web3, rewardPeriod);

    await validatorsFunctionality.sendVerdict(1, 0, 0, 0);

    const node1Hash = web3.utils.soliditySha3(1);
    const node2Hash = web3.utils.soliditySha3(2);
    await validatorsData.getValidatedArray(node1Hash).should.be.eventually.empty;
    (await validatorsData.getValidatedArray(node2Hash)).length.should.be.equal(1);

    await nodesData.changeNodeLastRewardDate(0);
    await validatorsFunctionality.upgradeValidator(0);

    const validatedArray = await validatorsData.getValidatedArray(node2Hash);
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
                                "0x1122334459");
      }

      const leavingCount = nodesCount - activeNodesCount;
      for (let i = 0; i < leavingCount; ++i) {
        await nodesData.setNodeLeaving(Math.floor(i * nodesCount / leavingCount));
      }
    });

    it("should add validator", async () => {
      for (let node = 0; node < nodesCount; ++node) {
        if (await nodesData.isNodeActive(node)) {
          const { logs } = await validatorsFunctionality.addValidator(node);

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
