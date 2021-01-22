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
    beforeEach(async () => {
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
                    if (j === 2 ** i - 2) {
                        isRightLeaf = true;
                    }
                }
                (await segmentTree.getElem(j)).toNumber().should.be.equal(isRightLeaf ? 150 : 0);
            }
        });

        it("should check elems after adding to last", async () => {
            await segmentTree.addToLast(10);
            for(let j = 1; j <= 253; j++) {
                let isRightLeaf = false;
                for(let i = 1; i <= 8; i++) {
                    if (j === 2 ** i - 2) {
                        isRightLeaf = true;
                    }
                }
                (await segmentTree.getElem(j)).toNumber().should.be.equal(isRightLeaf ? 160 : 0);
            }
        });

        it("should reject if index is incorrect", async () => {
            await segmentTree.getElem(254);
            await segmentTree.getElem(255).should.be.eventually.rejectedWith("Incorrect index");
            await segmentTree.getElem(100000000000).should.be.eventually.rejectedWith("Incorrect index");
        });
    });

    describe("move elements", async () => {
        it("should add elem to some place", async () => {
            await segmentTree.addToPlace(53, 12);
            // let index = 0;
            // for (let i = 1; i <= 8; i++) {
            //     let str = "";
            //     for (index; index <= 2 ** i - 2; index++) {
            //         str += (await segmentTree.getElem(index)).toString() + " ";
            //     }
            //     console.log(str);
            // }
            (await segmentTree.getElem(0)).toNumber().should.be.equal(162);
            let lastLeaf = 180;
            while (lastLeaf > 1) {
                (await segmentTree.getElem(lastLeaf - 1)).toNumber().should.be.equal(12);
                lastLeaf = Math.floor(lastLeaf / 2);
            }
        });

        it("should add elem and remove elem to some place", async () => {
            await segmentTree.addToPlace(53, 12);
            (await segmentTree.getElem(0)).toNumber().should.be.equal(162);
            let lastLeaf = 180;
            while (lastLeaf > 1) {
                (await segmentTree.getElem(lastLeaf - 1)).toNumber().should.be.equal(12);
                lastLeaf = Math.floor(lastLeaf / 2);
            }
            await segmentTree.removeFromPlace(53, 5);
            (await segmentTree.getElem(0)).toNumber().should.be.equal(157);
            lastLeaf = 180;
            while (lastLeaf > 1) {
                (await segmentTree.getElem(lastLeaf - 1)).toNumber().should.be.equal(7);
                lastLeaf = Math.floor(lastLeaf / 2);
            }
        });

        it("should remove from one and move to another place", async () => {
            await segmentTree.removeFromPlace(128, 16);
            (await segmentTree.getElem(0)).toNumber().should.be.equal(134);
            let lastLeaf = 255;
            while (lastLeaf > 1) {
                (await segmentTree.getElem(lastLeaf - 1)).toNumber().should.be.equal(134);
                lastLeaf = Math.floor(lastLeaf / 2);
            }
            await segmentTree.addToPlace(23, 16);
            (await segmentTree.getElem(0)).toNumber().should.be.equal(150);
            lastLeaf = 150;
            while (lastLeaf > 1) {
                (await segmentTree.getElem(lastLeaf - 1)).toNumber().should.be.equal(16);
                lastLeaf = Math.floor(lastLeaf / 2);
            }
        });

        it("should reject if place is incorrect", async () => {
            await segmentTree.addToPlace(38, 16);
            await segmentTree.removeFromPlace(99, 16);
            await segmentTree.addToPlace(0, 16).should.be.eventually.rejectedWith("Incorrect place");
            await segmentTree.removeFromPlace(129, 16).should.be.eventually.rejectedWith("Incorrect place");
        });
    });

    describe("calculating sum", async () => {
        it("should calculate correct sum", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            (await segmentTree.sumFromPlaceToLast(1)).toNumber().should.be.equal(150);
            (await segmentTree.sumFromPlaceToLast(128)).toNumber().should.be.equal(150);
            (await segmentTree.sumFromPlaceToLast(127)).toNumber().should.be.equal(150);
            (await segmentTree.sumFromPlaceToLast(126)).toNumber().should.be.equal(150);
        });

        it("should calculate correct sum after adding some elements", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            await segmentTree.addToPlace(101, 5);
            await segmentTree.addToPlace(31, 50);
            await segmentTree.addToLast(8);
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(101)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(102)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(80)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(32)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(31)).toNumber().should.be.equal(213);
            (await segmentTree.sumFromPlaceToLast(128)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(127)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(126)).toNumber().should.be.equal(158);
        });

        it("should calculate correct sum after adding and removing some elements", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            await segmentTree.addToPlace(101, 5);
            await segmentTree.addToPlace(31, 50);
            await segmentTree.addToLast(8);
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(101)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(102)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(80)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(32)).toNumber().should.be.equal(163);
            (await segmentTree.sumFromPlaceToLast(31)).toNumber().should.be.equal(213);
            (await segmentTree.sumFromPlaceToLast(128)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(127)).toNumber().should.be.equal(158);
            (await segmentTree.sumFromPlaceToLast(126)).toNumber().should.be.equal(158);
            await segmentTree.removeFromPlace(128, 30);
            await segmentTree.removeFromPlace(101, 5);
            await segmentTree.removeFromPlace(31, 2);
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(101)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(102)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(80)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(32)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(31)).toNumber().should.be.equal(176);
            (await segmentTree.sumFromPlaceToLast(128)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(127)).toNumber().should.be.equal(128);
            (await segmentTree.sumFromPlaceToLast(126)).toNumber().should.be.equal(128);
        });
    });

    describe("random elem", async () => {
        it("should return last place", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            (await segmentTree.getRandomElem(100)).toNumber().should.be.equal(128);
        });

        it("should return zero if no place", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            (await segmentTree.getRandomElem(100)).toNumber().should.be.equal(128);
            await segmentTree.removeFromPlace(128, 150);
            (await segmentTree.sumFromPlaceToLast(1)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(1)).toNumber().should.be.equal(0);
            await segmentTree.addToPlace(99, 150);
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(100)).toNumber().should.be.equal(0);
            (await segmentTree.sumFromPlaceToLast(99)).toNumber().should.be.equal(150);
            (await segmentTree.getRandomElem(99)).toNumber().should.be.equal(99);
        });

        it("should reject if place is incorrect", async () => {
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(150);
            (await segmentTree.getRandomElem(100)).toNumber().should.be.equal(128);
            await segmentTree.removeFromPlace(128, 150);
            (await segmentTree.sumFromPlaceToLast(1)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(1)).toNumber().should.be.equal(0);
            await segmentTree.addToPlace(99, 150);
            (await segmentTree.sumFromPlaceToLast(100)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(100)).toNumber().should.be.equal(0);
            (await segmentTree.sumFromPlaceToLast(99)).toNumber().should.be.equal(150);
            (await segmentTree.getRandomElem(99)).toNumber().should.be.equal(99);
            await segmentTree.getRandomElem(0).should.be.rejectedWith("Incorrect place");
            (await segmentTree.getRandomElem(128)).toNumber().should.be.equal(0);
            await segmentTree.addToPlace(128, 1000);
            (await segmentTree.getRandomElem(128)).toNumber().should.be.equal(128);
            (await segmentTree.getRandomElem(127)).toNumber().should.be.equal(128);
            await segmentTree.removeFromPlace(128, 1000);
            (await segmentTree.getRandomElem(128)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(127)).toNumber().should.be.equal(0);
            await segmentTree.addToPlace(127, 1000);
            (await segmentTree.getRandomElem(128)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(127)).toNumber().should.be.equal(127);
            await segmentTree.getRandomElem(129).should.be.rejectedWith("Incorrect place");
            await segmentTree.getRandomElem(100000).should.be.rejectedWith("Incorrect place");


        });

        it("should return and remove random places", async () => {
            await segmentTree.addToPlace(127, 5);
            await segmentTree.addToPlace(54, 50);
            await segmentTree.addToPlace(106, 25);
            await segmentTree.addToPlace(77, 509);
            for(let i = 0; i < 180; i++) {
                const place = (await segmentTree.getRandomElem(78)).toNumber();
                await segmentTree.removeFromPlace(place, 1);
                // console.log("Place found!!!!!!!!!!!!")
                // console.log(place);
            }
            (await segmentTree.getRandomElem(78)).toNumber().should.be.equal(0);
            (await segmentTree.getRandomElem(77)).toNumber().should.be.equal(77);
        });

        it("random stress simulating large schains test", async () => {
            const schainPlace = 32; // 1/4 of node
            await segmentTree.removeFromPlace(128, 100); // make 50 nodes
            for(let i = 0; i < 200; i++) { // 200 times we could repeat removing
                const place = (await segmentTree.getRandomElem(schainPlace)).toNumber();
                // console.log("New place ", place);
                await segmentTree.removeFromPlace(place, 1);
                if (place - schainPlace > 0) {
                    // console.log(place - schainPlace);
                    await segmentTree.addToPlace(place - schainPlace, 1);
                }
            }
            // 201 time should be no nodes
            (await segmentTree.getRandomElem(schainPlace)).toNumber().should.be.equal(0);
        });
    });
});