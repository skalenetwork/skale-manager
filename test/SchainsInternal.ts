import { ContractManagerInstance,
         SchainsInternalInstance } from "../types/truffle-contracts";

import BigNumber from "bignumber.js";
import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { skipTime } from "./tools/time";

chai.should();
chai.use(chaiAsPromised);

class Schain {
    public name: string;
    public owner: string;
    public indexInOwnerList: BigNumber;
    public partOfNode: number;
    public lifetime: BigNumber;
    public startDate: BigNumber;
    public startBlock: BigNumber;
    public deposit: BigNumber;
    public index: BigNumber;

    constructor(
        arrayData: [string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber],
    ) {
        this.name = arrayData[0];
        this.owner = arrayData[1];
        this.indexInOwnerList = new BigNumber(arrayData[2]);
        this.partOfNode = new BigNumber(arrayData[3]).toNumber();
        this.lifetime = new BigNumber(arrayData[4]);
        this.startDate = new BigNumber(arrayData[5]);
        this.startBlock = new BigNumber(arrayData[6]);
        this.deposit = new BigNumber(arrayData[7]);
        this.index = new BigNumber(arrayData[8]);
    }
}

contract("SchainsInternal", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let schainsInternal: SchainsInternalInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        schainsInternal = await deploySchainsInternal(contractManager);
    });

    it("should initialize schain", async () => {
        await schainsInternal.initializeSchain("TestSchain", holder, 5, 5);

        const schain: Schain = new Schain(await schainsInternal.schains(web3.utils.soliditySha3("TestSchain")));
        schain.name.should.be.equal("TestSchain");
        schain.owner.should.be.equal(holder);
        assert(schain.lifetime.isEqualTo(5));
        assert(schain.deposit.isEqualTo(5));
    });

    describe("on existing schain", async () => {
        const schainNameHash = web3.utils.soliditySha3("TestSchain");

        beforeEach(async () => {
            await schainsInternal.initializeSchain("TestSchain", holder, 5, 5);
        });

        it("should register schain index for owner", async () => {
            await schainsInternal.setSchainIndex(schainNameHash, holder);

            const schain = new Schain(await schainsInternal.schains(schainNameHash));
            assert(schain.indexInOwnerList.isEqualTo(0));

            await schainsInternal.schainIndexes(holder, 0).should.eventually.equal(schainNameHash);
        });

        it("should be able to add schain to node", async () => {
            await schainsInternal.addSchainForNode(5, schainNameHash);
            await schainsInternal.getSchainIdsForNode(5).should.eventually.deep.equal([schainNameHash]);
        });

        it("should set amount of resources that schains occupied", async () => {
            await schainsInternal.addSchainForNode(5, schainNameHash);
            await schainsInternal.createGroup(schainNameHash, 1, schainNameHash);
            await schainsInternal.setNodeInGroup(schainNameHash, 1000000, 5);
            await schainsInternal.setSchainPartOfNode(schainNameHash, 2);

            expect(new Schain(await schainsInternal.schains(schainNameHash)).partOfNode).to.be.equal(2);
            const totalResources = new BigNumber(await schainsInternal.sumOfSchainsResources());
            assert(totalResources.isEqualTo(64));
        });

        it("should change schain lifetime", async () => {
            await schainsInternal.changeLifetime(schainNameHash, 7, 8);
            const schain = new Schain(await schainsInternal.schains(schainNameHash));
            assert(schain.lifetime.isEqualTo(12));
            assert(schain.deposit.isEqualTo(13));
        });

        describe("on registered schain", async function() {
            this.beforeEach(async () => {
                await schainsInternal.setSchainIndex(schainNameHash, holder);
                await schainsInternal.addSchainForNode(5, schainNameHash);
                await schainsInternal.setSchainPartOfNode(schainNameHash, 2);
            });

            it("should delete schain", async () => {
                await schainsInternal.removeSchain(schainNameHash, holder);
                const res = new Schain(await schainsInternal.schains(schainNameHash));
                res.name.should.be.equal("");
            });

            it("should remove schain from node", async () => {
                await schainsInternal.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsInternal.getLengthOfSchainsForNode(5)).isEqualTo(0));
            });

            it("should add another schain to the node and remove first correctly", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.removeSchainForNode(5, 0);
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [web3.utils.soliditySha3("NewSchain1"), web3.utils.soliditySha3("NewSchain")],
                );
            });

            it("should add a hole after deleting", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 1);
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 0)).isEqualTo(1));
            });

            it("should add another hole after deleting", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 1);
                await schainsInternal.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 0)).isEqualTo(0));
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 1)).isEqualTo(1));
            });

            it("should add another hole after deleting different order", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 0);
                await schainsInternal.removeSchainForNode(5, 1);
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 0)).isEqualTo(0));
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 1)).isEqualTo(1));
            });

            it("should add schain in a hole", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 0);
                await schainsInternal.removeSchainForNode(5, 1);
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                assert(new BigNumber(await schainsInternal.holesForNodes(5, 0)).isEqualTo(1));
                await schainsInternal.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        web3.utils.soliditySha3("NewSchain1"),
                    ],
                );
            });

            it("should add second schain in a hole", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 0);
                await schainsInternal.removeSchainForNode(5, 1);
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain3"));
                await schainsInternal.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        web3.utils.soliditySha3("NewSchain3"),
                        web3.utils.soliditySha3("NewSchain1"),
                    ],
                );
            });

            it("should add third schain like new", async () => {
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsInternal.removeSchainForNode(5, 0);
                await schainsInternal.removeSchainForNode(5, 1);
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain3"));
                await schainsInternal.addSchainForNode(5, web3.utils.soliditySha3("NewSchain4"));
                await schainsInternal.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        web3.utils.soliditySha3("NewSchain3"),
                        web3.utils.soliditySha3("NewSchain1"),
                        web3.utils.soliditySha3("NewSchain4"),
                    ],
                );
            });

            it("should get schain part of node", async () => {
                const part = new BigNumber(await schainsInternal.getSchainsPartOfNode(schainNameHash));
                assert(part.isEqualTo(2));
            });

            it("should return amount of created schains by user", async () => {
                assert(new BigNumber(await schainsInternal.getSchainListSize(holder)).isEqualTo(1));
                assert(new BigNumber(await schainsInternal.getSchainListSize(owner)).isEqualTo(0));
            });

            it("should get schains ids by user", async () => {
                await schainsInternal.getSchainIdsByAddress(holder).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return schains by node", async () => {
                await schainsInternal.getSchainIdsForNode(5).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return number of schains per node", async () => {
                const count = new BigNumber(await schainsInternal.getLengthOfSchainsForNode(5));
                assert (count.isEqualTo(1));
            });

        });

        it("should return list of schains", async () => {
            await schainsInternal.getSchains().should.eventually.deep.equal([schainNameHash]);
        });

        it("should check if schain name is available", async () => {
            await schainsInternal.isSchainNameAvailable("TestSchain").should.be.eventually.false;
            await schainsInternal.isSchainNameAvailable("D2WroteThisTest").should.be.eventually.true;
        });

        it("should check if schain is expired", async () => {
            await schainsInternal.isTimeExpired(schainNameHash).should.be.eventually.false;

            skipTime(web3, 6);

            await schainsInternal.isTimeExpired(schainNameHash).should.be.eventually.true;
        });

        it("should check if user is an owner of schain", async () => {
            await schainsInternal.isOwnerAddress(owner, schainNameHash).should.be.eventually.false;
            await schainsInternal.isOwnerAddress(holder, schainNameHash).should.be.eventually.true;
        });

    });
});
