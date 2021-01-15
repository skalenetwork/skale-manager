import chai = require("chai");
import chaiAsPromised from "chai-as-promised";
import {
    SegmentTreeTesterContract,
    SegmentTreeTesterInstance
} from "../../types/truffle-contracts";

const SegmentTree: SegmentTreeTesterContract = artifacts.require("SegmentTreeTester");

chai.should();
chai.use(chaiAsPromised);

contract("SegmentTree", ([owner]) => {
    let segmentTree: SegmentTreeTesterInstance;
    before(async () => {
        segmentTree = await SegmentTree.new();
        await segmentTree.initTree(150);
    });

    describe("initialization", async () => {
        it("Should check last right leaf of segment tree", async () => {
            (await segmentTree.getElem(254)).toNumber().should.be.equal(150);
        });

        it("Should check all parents of last right leaf of segment tree", async () => {
            for(let i = 1; i <= 8; i++) {
                (await segmentTree.getElem(2 ** i - 2)).toNumber().should.be.equal(150);
            }
        });

        it("Should check other elems", async () => {
            for(let j = 1; j <= 253; j++) {
                let isRightLeaf = false;
                for(let i = 1; i <= 8; i++) {
                    if (j == 2 ** i - 2) {
                        isRightLeaf = true;
                    }
                }
                (await segmentTree.getElem(j)).toNumber().should.be.equal(isRightLeaf ? 150 : 0);
                console.log(j);
            }
        });

        it("should check elems after adding to last", async () => {
            await segmentTree.addToLast(10);
            for(let j = 1; j <= 253; j++) {
                let isRightLeaf = false;
                for(let i = 1; i <= 8; i++) {
                    if (j == 2 ** i - 2) {
                        isRightLeaf = true;
                    }
                }
                (await segmentTree.getElem(j)).toNumber().should.be.equal(isRightLeaf ? 160 : 0);
                console.log(j);
            }
        });

        it("should reject if index is incorrect", async () => {
            await segmentTree.getElem(254);
            await segmentTree.getElem(255);
            await segmentTree.getElem(100000000000);
        });
    });

    describe("move elements", async () => {
    });

    describe("calculating sum", async () => {

    });

    describe("random elem", async () => {

    });
});
