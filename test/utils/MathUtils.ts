import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { web3, ethers } from "hardhat"
import { MathUtilsTester } from "../../typechain/MathUtilsTester";
import { makeSnapshot, applySnapshot } from "../tools/snapshot";

chai.should();
chai.use(chaiAsPromised);

describe("MathUtils", () => {
    let mathUtils: MathUtilsTester;
    let snapshot: number;
    before(async () => {
        const MathUtils = await ethers.getContractFactory("MathUtilsTester");
        mathUtils = (await MathUtils.deploy()) as MathUtilsTester;
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("in transaction", async () => {
        it("should subtract normally if reduced is greater than subtracted", async () => {
            (await mathUtils.callStatic.boundedSub(5, 3)).toNumber().should.be.equal(2);
            (await mathUtils.boundedSubWithoutEvent(5, 3)).toNumber().should.be.equal(2);
        });

        it("should return 0 if reduced is less than subtracted and emit event", async () => {
            (await mathUtils.callStatic.boundedSub(3, 5)).toNumber().should.be.equal(0);
            const receipt = await (await mathUtils.boundedSub(3, 5)).wait();
            receipt.logs.length.should.be.equal(1);
            const log = receipt.logs[0];
            log.topics.should.contain(web3.utils.keccak256("UnderflowError(uint256,uint256)"));
            const params = web3.eth.abi.decodeParameters(["uint256", "uint256"], log.data);
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
