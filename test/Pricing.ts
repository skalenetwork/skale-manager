import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

import { ContractManagerContract,
         ContractManagerInstance,
         NodesDataContract,
         NodesDataInstance,
         PricingContract,
         PricingInstance,
         SchainsDataContract,
         SchainsDataInstance,
         SkaleDKGContract,
         SkaleDKGInstance  } from "../types/truffle-contracts";
import { skipTime } from "./utils/time";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const Pricing: PricingContract = artifacts.require("./Pricing");
const SchainsData: SchainsDataContract = artifacts.require("./SchainsData");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

chai.should();
chai.use(chaiAsPromised);

contract("Pricing", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let pricing: PricingInstance;
    let schainsData: SchainsDataInstance;
    let nodesData: NodesDataInstance;
    let skaleDKG: SkaleDKGInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        pricing = await Pricing.new(contractManager.address, {from: owner});
        schainsData = await SchainsData.new("SchainsFunctionality", contractManager.address, {from: owner});
        nodesData = await NodesData.new(5260000, contractManager.address, {from: owner});
        await contractManager.setContractsAddress("SchainsData", schainsData.address);
        await contractManager.setContractsAddress("NodesData", nodesData.address);
        skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);

    });

    describe("on initialized contracts", async () => {
        beforeEach(async () => {
            await schainsData.initializeSchain("BobSchain", holder, 10, 2);
            await schainsData.initializeSchain("DavidSchain", holder, 10, 4);
            await schainsData.initializeSchain("JacobSchain", holder, 10, 8);
            await nodesData.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
            await nodesData.addNode(holder, "Michael", "0x7f000003", "0x7f000004", 8545, "0x1122334455");
            await nodesData.addNode(holder, "Daniel", "0x7f000005", "0x7f000006", 8545, "0x1122334455");
            await nodesData.addNode(holder, "Steven", "0x7f000007", "0x7f000008", 8545, "0x1122334455");

        });

        it("should increase number of schains", async () => {
            const numberOfSchains = new BigNumber(await schainsData.numberOfSchains());
            assert(numberOfSchains.isEqualTo(3));
        });

        it("should increase number of nodes", async () => {
            const numberOfNodes = new BigNumber(await nodesData.getNumberOfNodes());
            assert(numberOfNodes.isEqualTo(4));
        });

        describe("on existing nodes and schains", async () => {
            const bobSchainHash = web3.utils.soliditySha3("BobSchain");
            const davidSchainHash = web3.utils.soliditySha3("DavidSchain");
            const jacobSchainHash = web3.utils.soliditySha3("JacobSchain");

            const johnNodeHash = web3.utils.soliditySha3("John");
            const michaelNodeHash = web3.utils.soliditySha3("Michael");
            const danielNodeHash = web3.utils.soliditySha3("Daniel");
            const stevenNodeHash = web3.utils.soliditySha3("Steven");

            beforeEach(async () => {
                const johnNodeIndex = new BigNumber(await nodesData.nodesNameToIndex(johnNodeHash)).toNumber();
                const michaelNodeIndex = new BigNumber(await nodesData.nodesNameToIndex(michaelNodeHash)).toNumber();
                const danielNodeIndex = new BigNumber(await nodesData.nodesNameToIndex(danielNodeHash)).toNumber();
                const stevenNodeIndex = new BigNumber(await nodesData.nodesNameToIndex(stevenNodeHash)).toNumber();

                await schainsData.addGroup(bobSchainHash, 1, bobSchainHash);
                await schainsData.addGroup(davidSchainHash, 1, davidSchainHash);
                await schainsData.addGroup(jacobSchainHash, 2, jacobSchainHash);

                await schainsData.setNodeInGroup(bobSchainHash, johnNodeIndex);
                await schainsData.setNodeInGroup(davidSchainHash, michaelNodeIndex);
                await schainsData.setNodeInGroup(jacobSchainHash, danielNodeIndex);
                await schainsData.setNodeInGroup(jacobSchainHash, stevenNodeIndex);

                await schainsData.addSchainForNode(johnNodeIndex, bobSchainHash);
                await schainsData.addSchainForNode(michaelNodeIndex, davidSchainHash);
                await schainsData.addSchainForNode(danielNodeIndex, jacobSchainHash);
                await schainsData.addSchainForNode(stevenNodeIndex, jacobSchainHash);

                await schainsData.setSchainPartOfNode(bobSchainHash, 4);
                await schainsData.setSchainPartOfNode(davidSchainHash, 4);
                await schainsData.setSchainPartOfNode(jacobSchainHash, 1);

            });

            it("should check load percentage of network", async () => {
                const numberOfNodes = new BigNumber(await nodesData.getNumberOfNodes()).toNumber();
                let sumNode = 0;
                for (let i = 0; i < numberOfNodes; i++) {
                    const getSchainIdsForNode = await schainsData.getSchainIdsForNode(i);
                    for (const schain of getSchainIdsForNode) {
                        const partOfNode = new BigNumber(await schainsData.getSchainsPartOfNode(schain)).toNumber();
                        const isNodeLeft = await nodesData.isNodeLeft(i);
                        if (partOfNode !== 0  && !isNodeLeft) {
                            sumNode += 128 / partOfNode;
                        }
                    }
                }
                const newLoadPercentage = Math.floor((sumNode * 100) / (128 * numberOfNodes));
                const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage()).toNumber();
                newLoadPercentage.should.be.equal(loadPercentage);
            });

            it("should check total number of nodes", async () => {
                await pricing.initNodes();
                const totalNodes = new BigNumber(await pricing.totalNodes());
                assert(totalNodes.isEqualTo(4));
            });

            it("should not change price when no any new nodes have been added", async () => {
                await pricing.initNodes();
                skipTime(web3, 61);
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("No any changes on nodes");
            });

            it("should not change price when the price is updated more often than necessary", async () => {
                await pricing.initNodes();
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("It's not a time to update a price");
            });

            it("should rejected if price - priceChange overflowed price", async () => {
                await nodesData.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545, "0x1122334455");
                skipTime(web3, 10 ** 6);
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("New price should be less than old price");
            });

            describe("change price when changing the number of nodes", async () => {
                let oldPrice: number;

                beforeEach(async () => {
                    await pricing.initNodes();
                    oldPrice = new BigNumber(await pricing.price()).toNumber();
                });

                async function getPrice(MINUTES_PASSED: number) {
                    const MIN_PRICE = new BigNumber(await pricing.MIN_PRICE()).toNumber();
                    const ADJUSTMENT_SPEED = new BigNumber(await pricing.ADJUSTMENT_SPEED()).toNumber();
                    const OPTIMAL_LOAD_PERCENTAGE = new BigNumber(await pricing.OPTIMAL_LOAD_PERCENTAGE()).toNumber();
                    const COOLDOWN_TIME = new BigNumber(await pricing.COOLDOWN_TIME()).toNumber();
                    skipTime(web3, MINUTES_PASSED * COOLDOWN_TIME);
                    await pricing.adjustPrice();

                    const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage()).toNumber();
                    let priceChange: number;
                    if (loadPercentage < OPTIMAL_LOAD_PERCENTAGE) {
                        priceChange = (-1) * (ADJUSTMENT_SPEED * oldPrice)
                                      * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 10 ** 6;
                    } else {
                        priceChange = (ADJUSTMENT_SPEED * oldPrice)
                                      * (loadPercentage - OPTIMAL_LOAD_PERCENTAGE) / 10 ** 6;
                    }
                    let price = oldPrice + priceChange * MINUTES_PASSED;
                    if (price < MIN_PRICE) {
                        price = MIN_PRICE;
                    }
                    return price;
                }

                it("should change price when new active node has been added", async () => {
                    await nodesData.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545, "0x1122334455");
                    const MINUTES_PASSED = 2;
                    const price = await getPrice(MINUTES_PASSED);
                    const newPrice = new BigNumber(await pricing.price()).toNumber();
                    price.should.be.equal(newPrice);
                    oldPrice.should.be.above(price);
                });

                it("should change price when active node has been removed", async () => {
                    await nodesData.setNodeLeft(0);
                    const MINUTES_PASSED = 2;
                    const price = await getPrice(MINUTES_PASSED);
                    const newPrice = new BigNumber(await pricing.price()).toNumber();
                    price.should.be.equal(newPrice);
                    price.should.be.above(oldPrice);
                });

                it("should set price to min of too many minutes passed and price is less than min", async () => {
                    await nodesData.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545, "0x1122334455");
                    const MINUTES_PASSED = 30;
                    const price = await getPrice(MINUTES_PASSED);
                    const MIN_PRICE = new BigNumber(await pricing.MIN_PRICE()).toNumber();
                    price.should.be.equal(MIN_PRICE);
                });
            });
        });
    });
});
