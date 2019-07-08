import { ContractManagerContract,
         ContractManagerInstance,
         SchainsDataContract,
         SchainsDataInstance} from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");

import BigNumber from "bignumber.js";
import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);
import { skipTime } from './utils/time'

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

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
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

        it("should register shain index for owner", async () => {
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
                await schainsData.schains(schainNameHash).should.be.empty;
            });

            it("should remove schain from node", async () => {
                await schainsData.removeSchainForNode(5, 0);
                assert(new BigNumber(await schainsData.getLengthOfSchainsForNode(5)).isEqualTo(0));
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
