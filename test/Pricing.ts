import { BigNumber, PopulatedTransaction, Wallet } from "ethers";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { ContractManager,
         Nodes,
         Pricing,
         SchainsInternal,
         ValidatorService,
         Schains,
         ConstantsHolder,
         NodeRotation } from "../typechain";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deployPricing } from "./tools/deploy/pricing";
import { deploySchainsInternal } from "./tools/deploy/schainsInternal";
import { skipTime, currentTime } from "./tools/time";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
import { deploySchains } from "./tools/deploy/schains";
import { deployConstantsHolder } from "./tools/deploy/constantsHolder";
import { deployNodeRotation } from "./tools/deploy/nodeRotation";
import { deploySkaleManagerMock } from "./tools/deploy/test/skaleManagerMock";
import { ethers, web3 } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { assert, expect } from "chai";

chai.should();
chai.use(chaiAsPromised);
chai.use(solidity);

async function getValidatorIdSignature(validatorId: BigNumber, signer: Wallet) {
    const hash = web3.utils.soliditySha3(validatorId.toString());
    if (hash) {
        const signature = await web3.eth.accounts.sign(hash, signer.privateKey);
        return signature.signature;
    } else {
        return "";
    }
}

function stringValue(value: string | null) {
    if (value) {
        return value;
    } else {
        return "";
    }
}

describe("Pricing", () => {
    let owner: SignerWithAddress;
    let holder: SignerWithAddress;
    let validator: SignerWithAddress;
    let nodeAddress: Wallet;

    let contractManager: ContractManager;
    let pricing: Pricing;
    let schainsInternal: SchainsInternal;
    let schains: Schains;
    let nodes: Nodes;
    let validatorService: ValidatorService;
    let constants: ConstantsHolder;
    let nodeRotation: NodeRotation;

    beforeEach(async () => {
        [owner, holder, validator] = await ethers.getSigners();

        nodeAddress = new Wallet(String(privateKeys[3])).connect(ethers.provider);

        await owner.sendTransaction({to: nodeAddress.address, value: ethers.utils.parseEther("10000")});

        contractManager = await deployContractManager();

        nodes = await deployNodes(contractManager);
        schainsInternal = await deploySchainsInternal(contractManager);
        schains = await deploySchains(contractManager);
        pricing = await deployPricing(contractManager);
        validatorService = await deployValidatorService(contractManager);
        constants = await deployConstantsHolder(contractManager);
        nodeRotation = await deployNodeRotation(contractManager);

        const skaleManagerMock = await deploySkaleManagerMock(contractManager);
        await contractManager.setContractsAddress("SkaleManager", skaleManagerMock.address);

        await validatorService.connect(validator).registerValidator("Validator", "D2", 0, 0);
        const validatorIndex = await validatorService.getValidatorId(validator.address);
        const signature1 = await getValidatorIdSignature(validatorIndex, nodeAddress);
        await validatorService.connect(validator).linkNodeAddress(nodeAddress.address, signature1);
    });

    describe("on initialized contracts", async () => {
        beforeEach(async () => {
            await schainsInternal.initializeSchain("BobSchain", holder.address, 10, 2);
            await schainsInternal.initializeSchain("DavidSchain", holder.address, 10, 4);
            await schainsInternal.initializeSchain("JacobSchain", holder.address, 10, 8);
            const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "elvis1",
                    domainName: "some.domain.name"
                });

            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000003",
                    publicIp: "0x7f000003",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "elvis2",
                    domainName: "some.domain.name"
                });

            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000005",
                    publicIp: "0x7f000005",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "elvis3",
                    domainName: "some.domain.name"
                });

            await nodes.createNode(
                nodeAddress.address,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000007",
                    publicIp: "0x7f000007",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "elvis4",
                    domainName: "some.domain.name"
                });

        });

        it("should increase number of schains", async () => {
            const numberOfSchains = await schainsInternal.numberOfSchains();
            numberOfSchains.should.be.equal(3);
        });

        it("should increase number of nodes", async () => {
            const numberOfNodes = await nodes.getNumberOfNodes();
            numberOfNodes.should.be.equal(4);
        });

        describe("on existing nodes and schains", async () => {
            const bobSchainHash = stringValue(web3.utils.soliditySha3("BobSchain"));
            const davidSchainHash = stringValue(web3.utils.soliditySha3("DavidSchain"));
            const jacobSchainHash = stringValue(web3.utils.soliditySha3("JacobSchain"));

            const johnNodeHash = stringValue(web3.utils.soliditySha3("John"));
            const michaelNodeHash = stringValue(web3.utils.soliditySha3("Michael"));
            const danielNodeHash = stringValue(web3.utils.soliditySha3("Daniel"));
            const stevenNodeHash = stringValue(web3.utils.soliditySha3("Steven"));

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
                        const getSchainHashesForNode = await schainsInternal.getSchainHashesForNode(i);
                        for (const schain of getSchainHashesForNode) {
                            const partOfNode = await schainsInternal.getSchainsPartOfNode(schain);
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
                const loadPercentage = await pricing.getTotalLoadPercentage();
                loadPercentage.should.be.equal(newLoadPercentage);
            });

            it("should check total number of nodes", async () => {
                await pricing.initNodes();
                const totalNodes = await pricing.totalNodes();
                totalNodes.should.be.equal(4);
            });

            it("should not change price when no any new nodes have been added", async () => {
                await pricing.initNodes();
                await skipTime(ethers, 61);
                await pricing.adjustPrice()
                    .should.be.eventually.rejectedWith("No changes to node supply");
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
                    const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
                    await nodes.createNode(
                        nodeAddress.address,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f000010",
                            publicIp: "0x7f000011",
                            publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                            name: "vadim",
                            domainName: "some.domain.name"
                        });
                    const MINUTES_PASSED = 2;
                    await skipTime(ethers, lastUpdated + MINUTES_PASSED * 60 - await currentTime(ethers));

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
                            const getSchainHashesForNode = await schainsInternal.getSchainHashesForNode(i);
                            let totalPartOfNode = 0;
                            numberOfSchains = 0;
                            for (const schain of getSchainHashesForNode) {
                                const partOfNode = await schainsInternal.getSchainsPartOfNode(schain);
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
                        await nodeRotation.exitFromSchain(nodeToExit);
                    }
                    await nodes.completeExit(nodeToExit);

                    const MINUTES_PASSED = 2;
                    await skipTime(ethers, lastUpdated + MINUTES_PASSED * 60 - await currentTime(ethers));

                    await pricing.adjustPrice();
                    const receivedPrice = (await pricing.price()).toNumber();

                    const correctPrice = await getPrice((await pricing.lastUpdated()).toNumber() - lastUpdated);

                    receivedPrice.should.be.equal(correctPrice);
                    oldPrice.should.be.below(receivedPrice);
                });

                it("should set price to min of too many minutes passed and price is less than min", async () => {
                    const pubKey = ec.keyFromPrivate(String(nodeAddress.privateKey).slice(2)).getPublic();
                    await nodes.createNode(
                        nodeAddress.address,
                        {
                            port: 8545,
                            nonce: 0,
                            ip: "0x7f000010",
                            publicIp: "0x7f000011",
                            publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                            name: "vadim",
                            domainName: "some.domain.name"
                        });

                    const MINUTES_PASSED = 30;
                    await skipTime(ethers, lastUpdated + MINUTES_PASSED * 60 - await currentTime(ethers));

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
