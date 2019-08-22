import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

import {ContractManagerContract,
        ContractManagerInstance,
        PricingInstance,
        PricingContract,
        SchainsDataContract,
        SchainsDataInstance,
        NodesDataContract,
        NodesDataInstance} from "../types/truffle-contracts";
import { totalmem } from "os";
import { skipTime } from "./utils/time";



const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const Pricing: PricingContract = artifacts.require("./Pricing");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");


chai.should();
chai.use(chaiAsPromised);

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


contract("Pricing", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let pricing: PricingInstance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        pricing = await Pricing.new(contractManager.address, {from: owner});
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
        nodesData = await NodesData.new(5260000, contractManager.address, {from: owner});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);
        await contractManager.setContractsAddress("NodesData", nodesData.address);

    });

    describe("on existing schain", async () => {
        const bobSchainHash = web3.utils.soliditySha3("BobSchain");
        const davidSchainHash = web3.utils.soliditySha3("DavidSchain");
        const jacobSchainHash = web3.utils.soliditySha3("JacobSchain");

        beforeEach(async () => {
            schainsData.initializeSchain("BobSchain", holder, 10, 2);
            schainsData.initializeSchain("DavidSchain", holder, 10, 4);
            schainsData.initializeSchain("JacobSchain", holder, 10, 8);
            nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            nodesData.addNode(holder, "Michael", "0x7f000003", "0x7f000004", 8545, "0x1122334455");
            nodesData.addNode(holder, "Daniel", "0x7f000005", "0x7f000006", 8545, "0x1122334455");
            nodesData.addNode(holder, "Steven", "0x7f000007", "0x7f000008", 8545, "0x1122334455");

        })

        it("should increase number of schains", async () => {
            const numberOfSchains = new BigNumber(await schainsData.numberOfSchains());
            assert(numberOfSchains.isEqualTo(3));

        })


        describe("on existing nodes and schains", async () => {
            beforeEach(async () => {
                const johnIndex = new BigNumber(await nodesData.nodesNameToIndex(web3.utils.soliditySha3('John'))).toNumber();
                const michaelIndex = new BigNumber(await nodesData.nodesNameToIndex(web3.utils.soliditySha3('Michael'))).toNumber();
                const danielIndex = new BigNumber(await nodesData.nodesNameToIndex(web3.utils.soliditySha3('Daniel'))).toNumber();
                const stevenIndex = new BigNumber(await nodesData.nodesNameToIndex(web3.utils.soliditySha3('Steven'))).toNumber();
                schainsData.addSchainForNode(johnIndex, bobSchainHash);
                schainsData.addSchainForNode(michaelIndex, davidSchainHash);
                schainsData.addSchainForNode(danielIndex, jacobSchainHash);
                schainsData.addSchainForNode(stevenIndex, jacobSchainHash);

                schainsData.addGroup(bobSchainHash, 1, bobSchainHash);
                schainsData.addGroup(davidSchainHash, 1, davidSchainHash);
                schainsData.addGroup(jacobSchainHash, 2, jacobSchainHash);
                schainsData.setNodeInGroup(bobSchainHash, johnIndex);
                schainsData.setNodeInGroup(davidSchainHash, michaelIndex);
                schainsData.setNodeInGroup(jacobSchainHash, danielIndex);
                schainsData.setNodeInGroup(jacobSchainHash, stevenIndex);

                schainsData.setSchainPartOfNode(bobSchainHash, 4);
                schainsData.setSchainPartOfNode(davidSchainHash, 8);
                schainsData.setSchainPartOfNode(jacobSchainHash, 128);
    
            })

            it("should check load percentage of network", async () => {

                const totalResources = new BigNumber(await schainsData.sumOfSchainsResources());
                assert(totalResources.isEqualTo(50));
                const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage());
                assert(loadPercentage.isEqualTo(9))
        
            })
            
            it("should check number of working nodes", async () => {
                await nodesData.setNodeLeft(0);
                await pricing.checkAllNodes();
                
                const workingNodes = new BigNumber(await pricing.workingNodes());
                assert(workingNodes.isEqualTo(3));
            })
            
            it("should check number of total nodes", async () => {
                await pricing.checkAllNodes();
                const totalNodes = new BigNumber(await pricing.totalNodes());
                assert(totalNodes.isEqualTo(4));
            })
            
            it("should not change price when no any new working or total nodes have been added", async () => {
                await pricing.initNodes();
                skipTime(web3, 60);
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("No any changes on nodes");
            })
            
            it("should change price when new working nodes have been added", async () => {
                await pricing.initNodes();
                const oldPrice = new BigNumber(await pricing.price()).toNumber();
                nodesData.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545, "0x1122334455");
                skipTime(web3, 120);
                await pricing.adjustPrice();
                const newPrice = new BigNumber(await pricing.price()).toNumber();

                const OPTIMAL_LOAD_PERCENTAGE = new BigNumber(await pricing.OPTIMAL_LOAD_PERCENTAGE()).toNumber();
                const ADJUSTMENT_SPEED = new BigNumber(await pricing.ADJUSTMENT_SPEED()).toNumber();
                const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage()).toNumber();
                const priceChange = (ADJUSTMENT_SPEED * oldPrice) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 1000000;
                const price = oldPrice - priceChange * 2;
                price.should.be.equal(newPrice);
            })


            it("should change price when usual nodes have been added", async () => {
                await pricing.initNodes();
                const oldPrice = new BigNumber(await pricing.price()).toNumber();
                nodesData.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545, "0x1122334455");
                skipTime(web3, 120);
                await pricing.adjustPrice();
                const newPrice = new BigNumber(await pricing.price()).toNumber();

                const OPTIMAL_LOAD_PERCENTAGE = new BigNumber(await pricing.OPTIMAL_LOAD_PERCENTAGE()).toNumber();
                const ADJUSTMENT_SPEED = new BigNumber(await pricing.ADJUSTMENT_SPEED()).toNumber();
                const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage()).toNumber();
                const priceChange = (ADJUSTMENT_SPEED * oldPrice) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 1000000;
                const price = oldPrice - priceChange * 2;
                price.should.be.equal(newPrice);
            })

        })
            
    })
})