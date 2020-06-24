import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";

import { ContractManagerInstance,
         NodesInstance,
         PricingInstance,
         SchainsInternalInstance,
         ValidatorServiceInstance,
         SchainsInstance,
         ConstantsHolderInstance} from "../types/truffle-contracts";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deployPricing } from "./tools/deploy/pricing";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { skipTime, currentTime } from "./tools/time";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";

chai.should();
chai.use(chaiAsPromised);

contract("Pricing", ([owner, holder, validator, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let pricing: PricingInstance;
    let schainsInternal: SchainsInternalInstance;
    let schains: SchainsInstance;
    let nodes: NodesInstance;
    let validatorService: ValidatorServiceInstance;
    let constants: ConstantsHolderInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        pricing = await deployPricing(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constants = await deployConstantsHolder(contractManager);

        await validatorService.registerValidator("Validator", "D2", 0, 0, {from: validator});
        const validatorIndex = await validatorService.getValidatorId(validator);
        let signature1 = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), nodeAddress);
        signature1 = (signature1.slice(130) === "00" ? signature1.slice(0, 130) + "1b" :
                (signature1.slice(130) === "01" ? signature1.slice(0, 130) + "1c" : signature1));
        await validatorService.linkNodeAddress(nodeAddress, signature1, {from: validator});
    });

    describe("on initialized contracts", async () => {
        beforeEach(async () => {
            await schainsInternal.initializeSchain("BobSchain", holder, 10, 2);
            await schainsInternal.initializeSchain("DavidSchain", holder, 10, 4);
            await schainsInternal.initializeSchain("JacobSchain", holder, 10, 8);
            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "elvis1"
                });

            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "elvis2"
                });

            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000005",
                    publicIp: "0x7f000005",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "elvis3"
                });

            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000007",
                    publicIp: "0x7f000007",
                    publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                "0x1122334455667788990011223344556677889900112233445566778899001122"],
                    name: "elvis4"
                });

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

                await schainsInternal.createGroupForSchain(bobSchainHash, 1, 32);
                await schainsInternal.createGroupForSchain(davidSchainHash, 1, 32);
                await schainsInternal.createGroupForSchain(jacobSchainHash, 2, 128);

            });

            async function getLoadCoefficient() {
                const numberOfNodes = (await nodes.getNumberOfNodes()).toNumber();
                let sumNode = 0;
                for (let i = 0; i < numberOfNodes; i++) {
                    if (await nodes.isNodeActive(i)) {
                        const getSchainIdsForNode = await schainsInternal.getSchainIdsForNode(i);
                        for (const schain of getSchainIdsForNode) {
                            const partOfNode = (await schainsInternal.getSchainsPartOfNode(schain)).toNumber();
                            const isNodeLeft = await nodes.isNodeLeft(i);
                            if (partOfNode !== 0  && !isNodeLeft) {
                                sumNode += partOfNode;
                            }
                        }
                    }
                }
                return sumNode / (128 * (await nodes.getNumberOnlineNodes()).toNumber());
            }

            it("should check load percentage of network", async () => {
                const newLoadPercentage = Math.floor(await getLoadCoefficient() * 100);
                const loadPercentage = new BigNumber(await pricing.getTotalLoadPercentage()).toNumber();
                loadPercentage.should.be.equal(newLoadPercentage);
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

            describe("change price when changing the number of nodes", async () => {
                let oldPrice: number;
                let lastUpdated: number;

                beforeEach(async () => {
                    await pricing.initNodes();
                    oldPrice = (await pricing.price()).toNumber();
                    lastUpdated = (await pricing.lastUpdated()).toNumber()
                });

                async function getPrice(secondSincePreviousUpdate: number) {
                    const MIN_PRICE = (await constants.MIN_PRICE()).toNumber();
                    const ADJUSTMENT_SPEED = (await constants.ADJUSTMENT_SPEED()).toNumber();
                    const OPTIMAL_LOAD_PERCENTAGE = (await constants.OPTIMAL_LOAD_PERCENTAGE()).toNumber();
                    const COOLDOWN_TIME = (await constants.COOLDOWN_TIME()).toNumber();

                    const priceChangeSpeed = ADJUSTMENT_SPEED * (oldPrice / MIN_PRICE) * (await getLoadCoefficient() * 100 - OPTIMAL_LOAD_PERCENTAGE);
                    let price = oldPrice + priceChangeSpeed * secondSincePreviousUpdate / COOLDOWN_TIME;
                    if (price < MIN_PRICE) {
                        price = MIN_PRICE;
                    }
                    return Math.floor(price);
                }

                it("should change price when new active node has been added", async () => {
                    await nodes.createNode(
                        nodeAddress,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f000010",
                            publicIp: "0x7f000011",
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "vadim"
                        });
                    const MINUTES_PASSED = 2;
                    skipTime(web3, lastUpdated + MINUTES_PASSED * 60 - await currentTime(web3));

                    await pricing.adjustPrice();
                    const receivedPrice = (await pricing.price()).toNumber();

                    const correctPrice = await getPrice((await pricing.lastUpdated()).toNumber() - lastUpdated);

                    receivedPrice.should.be.equal(correctPrice);
                    oldPrice.should.be.above(receivedPrice);
                });

                it("should change price when active node has been removed", async () => {
                    // search non full node to rotate
                    let nodeToExit = -1;
                    let numberOfSchains = 0;
                    for (let i = 0; i < (await nodes.getNumberOfNodes()).toNumber(); i++) {
                        if (await nodes.isNodeActive(i)) {
                            const getSchainIdsForNode = await schainsInternal.getSchainIdsForNode(i);
                            let totalPartOfNode = 0;
                            numberOfSchains = 0;
                            for (const schain of getSchainIdsForNode) {
                                const partOfNode = (await schainsInternal.getSchainsPartOfNode(schain)).toNumber();
                                ++numberOfSchains;
                                totalPartOfNode += partOfNode;
                            }
                            if (totalPartOfNode < 100) {
                                nodeToExit = i;
                                break;
                            }
                        }
                    }

                    await nodes.initExit(nodeToExit);
                    for(let i = 0; i < numberOfSchains; ++i) {
                        await schains.exitFromSchain(nodeToExit);
                    }
                    await nodes.completeExit(nodeToExit);

                    const MINUTES_PASSED = 2;
                    skipTime(web3, lastUpdated + MINUTES_PASSED * 60 - await currentTime(web3));

                    await pricing.adjustPrice();
                    const receivedPrice = (await pricing.price()).toNumber();

                    const correctPrice = await getPrice((await pricing.lastUpdated()).toNumber() - lastUpdated);

                    receivedPrice.should.be.equal(correctPrice);
                    oldPrice.should.be.below(receivedPrice);
                });

                it("should set price to min of too many minutes passed and price is less than min", async () => {
                    await nodes.createNode(
                        nodeAddress,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f000010",
                            publicIp: "0x7f000011",
                            publicKey: ["0x1122334455667788990011223344556677889900112233445566778899001122",
                                        "0x1122334455667788990011223344556677889900112233445566778899001122"],
                            name: "vadim"
                        });

                    const MINUTES_PASSED = 30;
                    skipTime(web3, lastUpdated + MINUTES_PASSED * 60 - await currentTime(web3));

                    await pricing.adjustPrice();
                    const receivedPrice = (await pricing.price()).toNumber();

                    const correctPrice = await getPrice((await pricing.lastUpdated()).toNumber() - lastUpdated);

                    receivedPrice.should.be.equal(correctPrice);
                    oldPrice.should.be.above(receivedPrice);
                });
            });
        });
    });
});
