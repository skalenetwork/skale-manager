import { ContractManagerInstance,
         SchainsDataContract,
         SchainsDataInstance,
         SkaleDKGContract,
         SkaleDKGInstance } from "../types/truffle-contracts";

const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

import BigNumber from "bignumber.js";
import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);
import { gasMultiplier } from "./utils/command_line";
import { deployContractManager } from "./utils/deploy/contractManager";
import { skipTime } from "./utils/time";

class Schain {
    public name: string;
    public owner: string;
    public indexInOwnerList: BigNumber;
    public partOfNode: number;
    public lifetime: BigNumber;
    public startDate: BigNumber;
    public deposit: BigNumber;
    public index: BigNumber;

    constructor(arrayData: [string, string, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber, BigNumber]) {
        this.name = arrayData[0];
        this.owner = arrayData[1];
        this.indexInOwnerList = new BigNumber(arrayData[2]);
        this.partOfNode = new BigNumber(arrayData[3]).toNumber();
        this.lifetime = new BigNumber(arrayData[4]);
        this.startDate = new BigNumber(arrayData[5]);
        this.deposit = new BigNumber(arrayData[6]);
        this.index = new BigNumber(arrayData[7]);
    }
}

contract("SchainsData", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let schainsData: SchainsDataInstance;
    let skaleDKG: SkaleDKGInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
        await contractManager.setContractsAddress("SchainsData", schainsData.address, {from: owner});
        skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000 * gasMultiplier});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address, {from: owner});
    });

    it("should initialize schain", async () => {
        schainsData.initializeSchain("TestSchain", holder, 5, 5);

        const schain: Schain = new Schain(await schainsData.schains(web3.utils.soliditySha3("TestSchain")));
        schain.name.should.be.equal("TestSchain");
        schain.owner.should.be.equal(holder);
        assert(schain.lifetime.isEqualTo(5));
        assert(schain.deposit.isEqualTo(5));
    });

    describe("on existing schain", async () => {
        const schainNameHash = web3.utils.soliditySha3("TestSchain");

        beforeEach(async () => {
            schainsData.initializeSchain("TestSchain", holder, 5, 5);
        });

        it("should register schain index for owner", async () => {
            await schainsData.setSchainIndex(schainNameHash, holder);

            const schain = new Schain(await schainsData.schains(schainNameHash));
            assert(schain.indexInOwnerList.isEqualTo(0));

            await schainsData.schainIndexes(holder, 0).should.eventually.equal(schainNameHash);
        });

        it("should be able to add schain to node", async () => {
            await schainsData.addSchainForNode(5, schainNameHash);
            await schainsData.getSchainIdsForNode(5).should.eventually.deep.equal([schainNameHash]);
        });

        it("should set amount of resources that schains occupied", async () => {
            await schainsData.addSchainForNode(5, schainNameHash);
            await schainsData.addGroup(schainNameHash, 1, schainNameHash);
            await schainsData.setNodeInGroup(schainNameHash, 5);
            await schainsData.setSchainPartOfNode(schainNameHash, 2);

            expect(new Schain(await schainsData.schains(schainNameHash)).partOfNode).to.be.equal(2);
            const totalResources = new BigNumber(await schainsData.sumOfSchainsResources());
            assert(totalResources.isEqualTo(64));
        });

        it("should change schain lifetime", async () => {
            await schainsData.changeLifetime(schainNameHash, 7, 8);
            const schain = new Schain(await schainsData.schains(schainNameHash));
            assert(schain.lifetime.isEqualTo(12));
            assert(schain.deposit.isEqualTo(13));
        });

        describe("on registered schain", async function() {
            this.beforeEach(async () => {
                await schainsData.setSchainIndex(schainNameHash, holder);
                await schainsData.addSchainForNode(5, schainNameHash);
                await schainsData.setSchainPartOfNode(schainNameHash, 2);
            });

            it("should delete schain", async () => {
                await schainsData.removeSchain(schainNameHash, holder);
                const res = new Schain(await schainsData.schains(schainNameHash));
                res.name.should.be.equal("");
            });

            it("should remove schain from node", async () => {
                await schainsData.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsData.getLengthOfSchainsForNode(5)).isEqualTo(0));
            });

            it("should add another schain to the node and remove first correctly", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.removeSchainForNode(5, 0);
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [web3.utils.soliditySha3("NewSchain1"), web3.utils.soliditySha3("NewSchain")],
                );
            });

            it("should add a hole after deleting", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 1);
                assert(new BigNumber(await schainsData.holesForNodes(5, 0)).isEqualTo(1));
            });

            it("should add another hole after deleting", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 1);
                await schainsData.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsData.holesForNodes(5, 0)).isEqualTo(0));
                assert(new BigNumber(await schainsData.holesForNodes(5, 1)).isEqualTo(1));
            });

            it("should add another hole after deleting different order", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 0);
                await schainsData.removeSchainForNode(5, 1);
                assert(new BigNumber(await schainsData.holesForNodes(5, 0)).isEqualTo(0));
                assert(new BigNumber(await schainsData.holesForNodes(5, 1)).isEqualTo(1));
            });

            it("should add schain in a hole", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 0);
                await schainsData.removeSchainForNode(5, 1);
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                assert(new BigNumber(await schainsData.holesForNodes(5, 0)).isEqualTo(1));
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        "0x0000000000000000000000000000000000000000000000000000000000000000",
                        web3.utils.soliditySha3("NewSchain1"),
                    ],
                );
            });

            it("should add second schain in a hole", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 0);
                await schainsData.removeSchainForNode(5, 1);
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain3"));
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        web3.utils.soliditySha3("NewSchain3"),
                        web3.utils.soliditySha3("NewSchain1"),
                    ],
                );
            });

            it("should add third schain like new", async () => {
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain1"));
                await schainsData.removeSchainForNode(5, 0);
                await schainsData.removeSchainForNode(5, 1);
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain2"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain3"));
                await schainsData.addSchainForNode(5, web3.utils.soliditySha3("NewSchain4"));
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal(
                    [
                        web3.utils.soliditySha3("NewSchain2"),
                        web3.utils.soliditySha3("NewSchain3"),
                        web3.utils.soliditySha3("NewSchain1"),
                        web3.utils.soliditySha3("NewSchain4"),
                    ],
                );
            });

            it("should get schain part of node", async () => {
                const part = new BigNumber(await schainsData.getSchainsPartOfNode(schainNameHash));
                assert(part.isEqualTo(2));
            });

            it("should return amount of created schains by user", async () => {
                assert(new BigNumber(await schainsData.getSchainListSize(holder)).isEqualTo(1));
                assert(new BigNumber(await schainsData.getSchainListSize(owner)).isEqualTo(0));
            });

            it("should get schains ids by user", async () => {
                await schainsData.getSchainIdsByAddress(holder).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return schains by node", async () => {
                await schainsData.getSchainIdsForNode(5).should.eventually.be.deep.equal([schainNameHash]);
            });

            it("should return number of schains per node", async () => {
                const count = new BigNumber(await schainsData.getLengthOfSchainsForNode(5));
                assert (count.isEqualTo(1));
            });

        });

        it("should return list of schains", async () => {
            await schainsData.getSchains().should.eventually.deep.equal([schainNameHash]);
        });

        it("should check if schain name is available", async () => {
            await schainsData.isSchainNameAvailable("TestSchain").should.be.eventually.false;
            await schainsData.isSchainNameAvailable("D2WroteThisTest").should.be.eventually.true;
        });

        it("should check if schain is expired", async () => {
            await schainsData.isTimeExpired(schainNameHash).should.be.eventually.false;

            skipTime(web3, 6);

            await schainsData.isTimeExpired(schainNameHash).should.be.eventually.true;
        });

        it("should check if user is an owner of schain", async () => {
            await schainsData.isOwnerAddress(owner, schainNameHash).should.be.eventually.false;
            await schainsData.isOwnerAddress(holder, schainNameHash).should.be.eventually.true;
        });

    });

    it("should calculate schainId from schainName", async () => {
        await schainsData.getSchainIdFromSchainName("D2WroteThisTest")
        .should.be.eventually.equal(web3.utils.soliditySha3("D2WroteThisTest"));
    });

});
