import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import {ethers} from "hardhat"
import {MathUtilsTester} from "../../typechain-types";
import {makeSnapshot, applySnapshot} from "../tools/snapshot";

chai.should();
chai.use(chaiAsPromised);

describe("MathUtils", () => {
    let mathUtils: MathUtilsTester;
    let snapshot: number;
    before(async () => {
        const MathUtils = await ethers.getContractFactory("MathUtilsTester");
        mathUtils = (await MathUtils.deploy()) as unknown as MathUtilsTester;
    });

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    describe("in transaction", () => {
        it("should subtract normally if reduced is greater than subtracted", async () => {
            (await mathUtils.boundedSub.staticCall(5, 3)).should.be.equal(2);
            (await mathUtils.boundedSubWithoutEvent(5, 3)).should.be.equal(2);
        });

        it("should return 0 if reduced is less than subtracted and emit event", async () => {
            (await mathUtils.boundedSub.staticCall(3, 5)).should.be.equal(0);

            await expect(mathUtils.boundedSub(3, 5))
                .to.emit(mathUtils, "UnderflowError")
                .withArgs(3, 5);
        });
    });

    describe("in call", () => {
        it("should subtract normally if reduced is greater than subtracted", async () => {
            (await mathUtils.boundedSubWithoutEvent(5, 3)).should.be.equal(2);
        });

        it("should return 0 if reduced is less than subtracted ", async () => {
            (await mathUtils.boundedSubWithoutEvent(3, 5)).should.be.equal(0);
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
