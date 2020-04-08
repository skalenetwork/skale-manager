import { BigNumber } from "bignumber.js";
import { ContractManagerInstance,
         ManagerDataInstance,
      } from "../types/truffle-contracts";

import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployManagerData } from "./tools/deploy/managerData";
chai.should();
chai.use((chaiAsPromised));

contract("ManagerData", ([deployer, user]) => {
  let contractManager: ContractManagerInstance;
  let managerData: ManagerDataInstance;

  before(async () => {
    contractManager = await deployContractManager();
    managerData = await deployManagerData(contractManager);
  });

  it("minersCap should be equal 0", async () => {
    const bn = new BigNumber(await managerData.minersCap());
    parseInt(bn.toString(), 10).should.be.equal(0);
  });

  it("startTime should be equal 0", async () => {
    const bn = new BigNumber(await managerData.startTime());
    parseInt(bn.toString(), 10).should.not.equal(0);
  });

  it("stageTime should be equal 0", async () => {
    const bn = new BigNumber(await managerData.stageTime());
    parseInt(bn.toString(), 10).should.be.equal(0);
  });

  it("stageNodes should be equal 0", async () => {
    const bn = new BigNumber(await managerData.stageNodes());
    parseInt(bn.toString(), 10).should.be.equal(0);
  });

  it("should sets miners capitalization", async () => {
    await managerData.setMinersCap(333, {from: deployer});
    const minersCap = new BigNumber(await managerData.minersCap());
    parseInt(minersCap.toString(), 10).should.be.equal(333);
  });

  it("should sets new stage time and new amount of Nodes at this stage", async () => {
    await managerData.setStageTimeAndStageNodes(120, {from: deployer});
    const minersCap = new BigNumber(await managerData.stageNodes());
    parseInt(minersCap.toString(), 10).should.be.equal(120);
  });

});
