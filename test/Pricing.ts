import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

import { ContractManagerInstance,
         NodesInstance,
         PricingInstance,
         SchainsInternalInstance } from "../types/truffle-contracts";
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deployPricing } from "./tools/deploy/pricing";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { skipTime } from "./tools/time";

chai.should();
chai.use(chaiAsPromised);

contract("Pricing", ([owner, holder]) => {
    let contractManager: ContractManagerInstance;
    let pricing: PricingInstance;
    let schainsInternal: SchainsInternalInstance;
    let nodes: NodesInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        pricing = await deployPricing(contractManager);
    });

    describe("on initialized contracts", async () => {
        beforeEach(async () => {
            await schainsInternal.initializeSchain("BobSchain", holder, 10, 2);
            await schainsInternal.initializeSchain("DavidSchain", holder, 10, 4);
            await schainsInternal.initializeSchain("JacobSchain", holder, 10, 8);
            await nodes.addNode(holder, "John", "0x7f000001", "0x7f000002", 8545,
            ["0x1122334455667788990011223344556677889900112233445566778899001122",
            "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
            await nodes.addNode(holder, "Michael", "0x7f000003", "0x7f000004", 8545,
            ["0x1122334455667788990011223344556677889900112233445566778899001122",
            "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
            await nodes.addNode(holder, "Daniel", "0x7f000005", "0x7f000006", 8545,
            ["0x1122334455667788990011223344556677889900112233445566778899001122",
            "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
            await nodes.addNode(holder, "Steven", "0x7f000007", "0x7f000008", 8545,
            ["0x1122334455667788990011223344556677889900112233445566778899001122",
            "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);

        });

        it("should increase number of schains", async () => {
            const numberOfSchains = new BigNumber(await schainsInternal.numberOfSchains());
            assert(numberOfSchains.isEqualTo(3));
        });

        it("should increase number of nodes", async () => {
            const numberOfNodes = new BigNumber(await nodes.getNumberOfNodes());
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
                const johnNodeIndex = new BigNumber(await nodes.nodesNameToIndex(johnNodeHash)).toNumber();
                const michaelNodeIndex = new BigNumber(await nodes.nodesNameToIndex(michaelNodeHash)).toNumber();
                const danielNodeIndex = new BigNumber(await nodes.nodesNameToIndex(danielNodeHash)).toNumber();
                const stevenNodeIndex = new BigNumber(await nodes.nodesNameToIndex(stevenNodeHash)).toNumber();

                await schainsInternal.createGroup(bobSchainHash, 1, bobSchainHash);
                await schainsInternal.createGroup(davidSchainHash, 1, davidSchainHash);
                await schainsInternal.createGroup(jacobSchainHash, 2, jacobSchainHash);

                await schainsInternal.setNodeInGroup(bobSchainHash, 100000, johnNodeIndex);
                await schainsInternal.setNodeInGroup(davidSchainHash, 100000, michaelNodeIndex);
                await schainsInternal.setNodeInGroup(jacobSchainHash, 100000, danielNodeIndex);
                await schainsInternal.setNodeInGroup(jacobSchainHash, 100000, stevenNodeIndex);

                await schainsInternal.addSchainForNode(johnNodeIndex, bobSchainHash);
                await schainsInternal.addSchainForNode(michaelNodeIndex, davidSchainHash);
                await schainsInternal.addSchainForNode(danielNodeIndex, jacobSchainHash);
                await schainsInternal.addSchainForNode(stevenNodeIndex, jacobSchainHash);

                await schainsInternal.setSchainPartOfNode(bobSchainHash, 4);
                await schainsInternal.setSchainPartOfNode(davidSchainHash, 4);
                await schainsInternal.setSchainPartOfNode(jacobSchainHash, 1);

            });

            it("should check load percentage of network", async () => {
                const numberOfNodes = new BigNumber(await nodes.getNumberOfNodes()).toNumber();
                let sumNode = 0;
                for (let i = 0; i < numberOfNodes; i++) {
                    const getSchainIdsForNode = await schainsInternal.getSchainIdsForNode(i);
                    for (const schain of getSchainIdsForNode) {
                        const partOfNode = new BigNumber(await schainsInternal.getSchainsPartOfNode(schain)).toNumber();
                        const isNodeLeft = await nodes.isNodeLeft(i);
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
                await nodes.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545,
                ["0x1122334455667788990011223344556677889900112233445566778899001122",
                "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
                skipTime(web3, 10 ** 6);
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("SafeMath: subtraction overflow");
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
                    await nodes.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545,
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                    "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
                    const MINUTES_PASSED = 2;
                    const price = await getPrice(MINUTES_PASSED);
                    const newPrice = new BigNumber(await pricing.price()).toNumber();
                    price.should.be.equal(newPrice);
                    oldPrice.should.be.above(price);
                });

                it("should change price when active node has been removed", async () => {
                    await nodes.setNodeLeft(0);
                    const MINUTES_PASSED = 2;
                    const price = await getPrice(MINUTES_PASSED);
                    const newPrice = new BigNumber(await pricing.price()).toNumber();
                    price.should.be.equal(newPrice);
                    price.should.be.above(oldPrice);
                });

                it("should set price to min of too many minutes passed and price is less than min", async () => {
                    await nodes.addNode(holder, "vadim", "0x7f000010", "0x7f000011", 8545,
                    ["0x1122334455667788990011223344556677889900112233445566778899001122",
                    "0x1122334455667788990011223344556677889900112233445566778899001122"], 0);
                    const MINUTES_PASSED = 30;
                    const price = await getPrice(MINUTES_PASSED);
                    const MIN_PRICE = new BigNumber(await pricing.MIN_PRICE()).toNumber();
                    price.should.be.equal(MIN_PRICE);
                });
            });
        });
    });
});
