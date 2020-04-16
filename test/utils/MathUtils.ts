import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { MathUtilsTesterContract, MathUtilsTesterInstance } from "../../types/truffle-contracts";

const MathUtils: MathUtilsTesterContract = artifacts.require("MathUtilsTester");

chai.should();
chai.use((chaiAsPromised as any));

contract("MathUtils", ([owner]) => {
    let mathUtils: MathUtilsTesterInstance;
    before(async () => {
        mathUtils = await MathUtils.new();
    });

    describe("in transaction", async () => {
        it("should subtract normally if reduced is greater than subtracted", async () => {
            (await mathUtils.boundedSub.call(5, 3)).toNumber().should.be.equal(2);
            (await mathUtils.boundedSubWithoutEvent(5, 3)).toNumber().should.be.equal(2);
        });

        it("should return 0 if reduced is less than subtracted and emit event", async () => {
            (await mathUtils.boundedSub.call(3, 5)).toNumber().should.be.equal(0);
            const response = await mathUtils.boundedSub(3, 5);
            response.receipt.rawLogs.length.should.be.equal(1);
            const log = response.receipt.rawLogs[0];
            log.topics.should.contain(web3.utils.keccak256("UnderflowError(uint256,uint256)"));
            const params = web3.eth.abi.decodeParameters(["uint256", "uint256"], log.data);
            console.log(params[0]);
            console.log(typeof params[0]);
            params[0].should.be.equal("3");
            params[1].should.be.equal("5");
        });
    });

    describe("in call", async () => {
        it("should subtract normally if reduced is greater than subtracted", async () => {
            (await mathUtils.boundedSubWithoutEvent(5, 3)).toNumber().should.be.equal(2);
        });

        it("should return 0 if reduced is less than subtracted ", async () => {
            (await mathUtils.boundedSubWithoutEvent(3, 5)).toNumber().should.be.equal(0);
        });
    });

    it("should properly compare", async () => {
        (await mathUtils.muchGreater(100, 0)).should.be.equal(false);
        (await mathUtils.muchGreater(1e6 + 1, 0)).should.be.equal(true);
    });

    it("should properly approximately check equality", async () => {
        (await mathUtils.approximatelyEqual(100, 0)).should.be.equal(true);
        (await mathUtils.approximatelyEqual(1e6 + 1, 0)).should.be.equal(false);
        (await mathUtils.approximatelyEqual(0, 100)).should.be.equal(true);
        (await mathUtils.approximatelyEqual(0, 1e6 + 1)).should.be.equal(false);
    });
});
