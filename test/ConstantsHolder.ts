import { BigNumber } from "bignumber.js";
import * as chaiAsPromised from "chai-as-promised";
import { ConstantsHolderInstance,
         ContractManagerInstance } from "../types/truffle-contracts";
import { skipTime } from "./tools/time";

import chai = require("chai");
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployContractManager } from "./tools/deploy/contractManager";

chai.should();
chai.use((chaiAsPromised as any));

contract("ConstantsHolder", ([deployer, user]) => {
  let contractManager: ContractManagerInstance;
  let constantsHolder: ConstantsHolderInstance;

  before(async () => {
    contractManager = await deployContractManager();
    constantsHolder = await deployConstantsHolder(contractManager);
  });

  it("NODE_DEPOSIT should be equal 100000000000000000000", async () => {
    const bn = new BigNumber(await constantsHolder.NODE_DEPOSIT());
    // convert Big Number to string and then string to number and compare with
    parseInt(bn.toString(), 10).should.be.equal(100000000000000000000);
  });

  it("SMALL_DIVISOR should be equal 128", async () => {
    const bn = new BigNumber(await constantsHolder.SMALL_DIVISOR());
    parseInt(bn.toString(), 10).should.be.equal(128);
  });

  it("MEDIUM_DIVISOR should be equal 8", async () => {
    const bn = new BigNumber(await constantsHolder.MEDIUM_DIVISOR());
    parseInt(bn.toString(), 10).should.be.equal(8);
  });

  it("LARGE_DIVISOR should be equal 1", async () => {
    const bn = new BigNumber(await constantsHolder.LARGE_DIVISOR());
    parseInt(bn.toString(), 10).should.be.equal(1);
  });

  it("MEDIUM_TEST_DIVISOR should be equal 4", async () => {
    const bn = new BigNumber(await constantsHolder.MEDIUM_TEST_DIVISOR());
    parseInt(bn.toString(), 10).should.be.equal(4);
  });

  it("NUMBER_OF_NODES_FOR_SCHAIN should be equal 16", async () => {
    const bn = new BigNumber(await constantsHolder.NUMBER_OF_NODES_FOR_SCHAIN());
    parseInt(bn.toString(), 10).should.be.equal(16);
  });

  it("NUMBER_OF_NODES_FOR_TEST_SCHAIN should be equal 2", async () => {
    const bn = new BigNumber(await constantsHolder.NUMBER_OF_NODES_FOR_TEST_SCHAIN());
    parseInt(bn.toString(), 10).should.be.equal(2);
  });

  it("NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN should be equal 4", async () => {
    const bn = new BigNumber(await constantsHolder.NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN());
    parseInt(bn.toString(), 10).should.be.equal(4);
  });

  it("SECONDS_TO_YEAR should be equal 31622400", async () => {
    const bn = new BigNumber(await constantsHolder.SECONDS_TO_YEAR());
    parseInt(bn.toString(), 10).should.be.equal(31622400);
  });

  it("NUMBER_OF_MONITORS should be equal 24", async () => {
    const bn = new BigNumber(await constantsHolder.NUMBER_OF_MONITORS());
    parseInt(bn.toString(), 10).should.be.equal(24);
  });

  it("rewardPeriod should be equal 3600", async () => {
    const bn = new BigNumber(await constantsHolder.rewardPeriod());
    parseInt(bn.toString(), 10).should.be.equal(3600);
  });

  it("deltaPeriod should be equal 300", async () => {
    const bn = new BigNumber(await constantsHolder.deltaPeriod());
    parseInt(bn.toString(), 10).should.be.equal(300);
  });

  it("checkTime should be equal 120", async () => {
    const bn = new BigNumber(await constantsHolder.checkTime());
    parseInt(bn.toString(), 10).should.be.equal(120);
  });

  it("should invoke setPeriods function and change rewardPeriod and deltaPeriod", async () => {
    await constantsHolder.setPeriods(333, 555, {from: deployer});
    const rewardPeriod = new BigNumber(await constantsHolder.rewardPeriod());
    parseInt(rewardPeriod.toString(), 10).should.be.equal(333);

    const deltaPeriod = new BigNumber(await constantsHolder.deltaPeriod());
    parseInt(deltaPeriod.toString(), 10).should.be.equal(555);
  });

  it("should Set latency", async () => {
    const miliSec = 100;
    await constantsHolder.setLatency(miliSec, {from: deployer});
    // expectation
    const res = new BigNumber(await constantsHolder.allowableLatency());
    // parseInt(bn.toString(), 10).should.be.equal(0)
    expect(parseInt(res.toString(), 10)).to.be.equal(miliSec);
  });

  it("should Set checkTime", async () => {
    const sec = 240;
    await constantsHolder.setCheckTime(sec, {from: deployer});
    // expectation
    const res = new BigNumber(await constantsHolder.checkTime());
    // parseInt(bn.toString(), 10).should.be.equal(0)
    expect(parseInt(res.toString(), 10)).to.be.equal(sec);
  });

  it("should set rotation delay", async () => {
    await constantsHolder.setRotationDelay(13);
    (await constantsHolder.rotationDelay()).toNumber()
      .should.be.equal(13);
  });

  it("should set proof-of-use lockup period", async () => {
    await constantsHolder.setProofOfUseLockUpPeriod(13);
    (await constantsHolder.proofOfUseLockUpPeriodDays()).toNumber()
      .should.be.equal(13);
  });

  it("should set proof-of-use delegation percentage", async () => {
    await constantsHolder.setProofOfUseDelegationPercentage(13);
    (await constantsHolder.proofOfUseDelegationPercentage()).toNumber()
      .should.be.equal(13);
  });

});
