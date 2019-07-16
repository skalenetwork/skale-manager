import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerContract, ContractManagerInstance,
        ValidatorsDataContract, ValidatorsDataInstance } from "../types/truffle-contracts";

const ValidatorsData: ValidatorsDataContract = artifacts.require("./ValidatorsData");
const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");

chai.should();
chai.use(chaiAsPromised);

contract("ValidatorsData", ([user, owner]) => {
    let validatorsData: ValidatorsDataInstance;
    let contractManager: ContractManagerInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        validatorsData = await ValidatorsData.new("ValidatorsFunctionality", contractManager.address, {from: owner});
    });

    it("should add validated node to validated array by valid validator", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("2");
        await validatorsData.addValidatedNode(validatorIndex, data, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await validatorsData.addValidatedNode(validatorIndex, data, {from: owner});
        const validatedArray = await validatorsData.getValidatedArray(validatorIndex);
        validatedArray.length.should.be.equal(1);
        validatedArray.should.be.deep.equal([data]);
    });

    it("should add correct verdict only by correct validator", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const downtime = new BigNumber(200);
        const latency = new BigNumber(300);
        await validatorsData.addVerdict(validatorIndex, downtime, latency, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await validatorsData.addVerdict(validatorIndex, downtime, latency, {from: owner});
        const dataLength = await validatorsData.getLengthOfMetrics(validatorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(1));
        const savedDowntime = new BigNumber(await validatorsData.verdicts(validatorIndex, "0", "0"));
        const savedLatency = new BigNumber(await validatorsData.verdicts(validatorIndex, "0", "1"));
        savedDowntime.should.be.deep.equal(downtime);
        savedLatency.should.be.be.deep.equal(latency);
    });

    it("should remove validated node by valid validator", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        const data = web3.utils.soliditySha3("2");
        await validatorsData.addValidatedNode(validatorIndex, data, {from: owner});
        const validatedArray = await validatorsData.getValidatedArray(validatorIndex);
        validatedArray.length.should.be.equal(1);
        await validatorsData.removeValidatedNode(validatorIndex, nodeIndex, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await validatorsData.removeValidatedNode(validatorIndex, nodeIndex, {from: owner});
        const validatedArrayAfter = await validatorsData.getValidatedArray(validatorIndex);
        validatedArrayAfter.length.should.be.equal(0);
    });

    it("should remove all verdicts by valid validator", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const downtime1 = new BigNumber(200);
        const latency1 = new BigNumber(300);
        await validatorsData.addVerdict(validatorIndex, downtime1, latency1, {from: owner});
        const downtime2 = new BigNumber(500);
        const latency2 = new BigNumber(200);
        await validatorsData.addVerdict(validatorIndex, downtime2, latency2, {from: owner});
        const downtime3 = new BigNumber(300);
        const latency3 = new BigNumber(400);
        await validatorsData.addVerdict(validatorIndex, downtime3, latency3, {from: owner});
        const dataLength = await validatorsData.getLengthOfMetrics(validatorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(3));
        await validatorsData.removeAllVerdicts(validatorIndex, {from: user})
        .should.be.rejectedWith("Message sender is invalid");
        await validatorsData.removeAllVerdicts(validatorIndex, {from: owner});
        const dataLengthAfter = await validatorsData.getLengthOfMetrics(validatorIndex);
        dataLengthAfter.should.be.deep.equal(web3.utils.toBN(0));
    });

    it("should get validated array", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const validatedArray = await validatorsData.getValidatedArray(validatorIndex);
        validatedArray.length.should.be.equal(0);
        const data1 = web3.utils.soliditySha3("2");
        await validatorsData.addValidatedNode(validatorIndex, data1, {from: owner});
        const validatedArray1 = await validatorsData.getValidatedArray(validatorIndex);
        validatedArray1.length.should.be.equal(1);
        const data2 = web3.utils.soliditySha3("3");
        await validatorsData.addValidatedNode(validatorIndex, data2, {from: owner});
        const validatedArray2 = await validatorsData.getValidatedArray(validatorIndex);
        validatedArray2.length.should.be.equal(2);
    });

    it("should get length of metrics", async () => {
        const validatorIndex = web3.utils.soliditySha3("1");
        const dataLength = await validatorsData.getLengthOfMetrics(validatorIndex);
        dataLength.should.be.deep.equal(web3.utils.toBN(0));
        const downtime1 = new BigNumber(200);
        const latency1 = new BigNumber(300);
        await validatorsData.addVerdict(validatorIndex, downtime1, latency1, {from: owner});
        const downtime2 = new BigNumber(500);
        const latency2 = new BigNumber(200);
        await validatorsData.addVerdict(validatorIndex, downtime2, latency2, {from: owner});
        const downtime3 = new BigNumber(300);
        const latency3 = new BigNumber(400);
        await validatorsData.addVerdict(validatorIndex, downtime3, latency3, {from: owner});
        const dataLengthAfter = await validatorsData.getLengthOfMetrics(validatorIndex);
        dataLengthAfter.should.be.deep.equal(web3.utils.toBN(3));
    });
});
