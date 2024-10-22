import {deployContractManager} from "../tools/deploy/contractManager";
import {deployPartialDifferencesTester} from "../tools/deploy/test/partialDifferencesTester";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {PartialDifferencesTester} from "../../typechain-types";
import {makeSnapshot, applySnapshot} from "../tools/snapshot";

chai.should();
chai.use(chaiAsPromised);

describe("PartialDifferences", () => {
    let contractManager;
    let partialDifferencesTester: PartialDifferencesTester;
    let snapshot: number;

    before(async () => {
        contractManager = await deployContractManager();
        partialDifferencesTester = await deployPartialDifferencesTester(contractManager);
    })

    beforeEach(async () => {
        snapshot = await makeSnapshot();
    });

    afterEach(async () => {
        await applySnapshot(snapshot);
    });

    it("should calculate sequences correctly", async () => {
        await partialDifferencesTester.createSequence();
        let sequence = await partialDifferencesTester.latestSequence();

        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 1)).should.be.equal(0);
        await partialDifferencesTester.reduceSequence(sequence, 1, 2, 2);

        await partialDifferencesTester.addToSequence(sequence, 5e7, 1);
        await partialDifferencesTester.subtractFromSequence(sequence, 3e7, 3);
        await partialDifferencesTester.addToSequence(sequence, 1e7, 4);
        await partialDifferencesTester.subtractFromSequence(sequence, 5e7, 5);
        await partialDifferencesTester.addToSequence(sequence, 1e7, 4);
        await partialDifferencesTester.addToSequence(sequence, 1e7, 4);

        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 1)).should.be.equal(5e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 2)).should.be.equal(5e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 3)).should.be.equal(2e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 4)).should.be.equal(5e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 5)).should.be.equal(0);

        await partialDifferencesTester.reduceSequence(sequence, 1, 2, 2);

        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 1)).should.be.equal(5e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 2)).should.be.equal(25e6);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 3)).should.be.equal(1e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 4)).should.be.equal(4e7);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 5)).should.be.equal(0);

        await partialDifferencesTester.createSequence();
        sequence = await partialDifferencesTester.latestSequence();
        await partialDifferencesTester.subtractFromSequence(sequence, 1, 1);
        await partialDifferencesTester.addToSequence(sequence, 1, 1);
        await partialDifferencesTester.getAndUpdateSequenceItem(sequence, 1);
        await partialDifferencesTester.reduceSequence(sequence, 1, 2, 1);
        (await partialDifferencesTester.getAndUpdateSequenceItem.staticCall(sequence, 1)).should.be.equal(0);
    });
});
