import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance, MonitorsInstance } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployMonitors } from "./tools/deploy/monitors";

chai.should();
chai.use(chaiAsPromised);

contract("MonitorsData", ([owner, user]) => {
    let monitors: MonitorsInstance;
    let contractManager: ContractManagerInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        monitors = await deployMonitors(contractManager);
    });

    it("should add validated node to validated array by valid monitor", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("2");
        await monitors.addCheckedNode(monitorIndex, data, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await monitors.addCheckedNode(monitorIndex, data, {from: owner});
        const validatedArray = await monitors.getCheckedArray(monitorIndex);
        validatedArray.length.should.be.equal(1);
        validatedArray.should.be.deep.equal([data]);
    });

    it("should add correct verdict only by correct monitor", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const downtime = new BigNumber(200);
        const latency = new BigNumber(300);
        await monitors.addVerdict(monitorIndex, downtime, latency, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await monitors.addVerdict(monitorIndex, downtime, latency, {from: owner});
        const dataLength = await monitors.getLengthOfMetrics(monitorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(1));
        const savedDowntime = new BigNumber(await monitors.verdicts(monitorIndex, "0", "0"));
        const savedLatency = new BigNumber(await monitors.verdicts(monitorIndex, "0", "1"));
        savedDowntime.should.be.deep.equal(downtime);
        savedLatency.should.be.be.deep.equal(latency);
    });

    it("should remove validated node by valid monitor", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        const data = web3.utils.soliditySha3("2");
        await monitors.addCheckedNode(monitorIndex, data, {from: owner});
        const validatedArray = await monitors.getCheckedArray(monitorIndex);
        validatedArray.length.should.be.equal(1);
        await monitors.removeCheckedNode(monitorIndex, nodeIndex, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await monitors.removeCheckedNode(monitorIndex, nodeIndex, {from: owner});
        const validatedArrayAfter = await monitors.getCheckedArray(monitorIndex);
        validatedArrayAfter.length.should.be.equal(0);
    });

    it("should remove all verdicts by valid monitor", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const downtime1 = new BigNumber(200);
        const latency1 = new BigNumber(300);
        await monitors.addVerdict(monitorIndex, downtime1, latency1, {from: owner});
        const downtime2 = new BigNumber(500);
        const latency2 = new BigNumber(200);
        await monitors.addVerdict(monitorIndex, downtime2, latency2, {from: owner});
        const downtime3 = new BigNumber(300);
        const latency3 = new BigNumber(400);
        await monitors.addVerdict(monitorIndex, downtime3, latency3, {from: owner});
        const dataLength = await monitors.getLengthOfMetrics(monitorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(3));
        await monitors.removeAllVerdicts(monitorIndex, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await monitors.removeAllVerdicts(monitorIndex, {from: owner});
        const dataLengthAfter = await monitors.getLengthOfMetrics(monitorIndex);
        dataLengthAfter.should.be.deep.equal(web3.utils.toBN(0));
    });

    it("should get validated array", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const validatedArray = await monitors.getCheckedArray(monitorIndex);
        validatedArray.length.should.be.equal(0);
        const data1 = web3.utils.soliditySha3("2");
        await monitors.addCheckedNode(monitorIndex, data1, {from: owner});
        const validatedArray1 = await monitors.getCheckedArray(monitorIndex);
        validatedArray1.length.should.be.equal(1);
        const data2 = web3.utils.soliditySha3("3");
        await monitors.addCheckedNode(monitorIndex, data2, {from: owner});
        const validatedArray2 = await monitors.getCheckedArray(monitorIndex);
        validatedArray2.length.should.be.equal(2);
    });

    it("should get length of metrics", async () => {
        const monitorIndex = web3.utils.soliditySha3("1");
        const dataLength = await monitors.getLengthOfMetrics(monitorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(0));
        const downtime1 = new BigNumber(200);
        const latency1 = new BigNumber(300);
        await monitors.addVerdict(monitorIndex, downtime1, latency1, {from: owner});
        const downtime2 = new BigNumber(500);
        const latency2 = new BigNumber(200);
        await monitors.addVerdict(monitorIndex, downtime2, latency2, {from: owner});
        const downtime3 = new BigNumber(300);
        const latency3 = new BigNumber(400);
        await monitors.addVerdict(monitorIndex, downtime3, latency3, {from: owner});
        const dataLengthAfter = await monitors.getLengthOfMetrics(monitorIndex);
        dataLengthAfter.should.be.deep.equal(web3.utils.toBN(3));
    });
});
