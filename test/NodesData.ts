import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerInstance,
         NodesInstance,
         ValidatorServiceInstance} from "../types/truffle-contracts";
import { currentTime, skipTime } from "./tools/time";

import * as elliptic from "elliptic";
const EC = elliptic.ec;
const ec = new EC("secp256k1");
import { privateKeys } from "./tools/private-keys";

import chai = require("chai");
import { deployContractManager } from "./tools/deploy/contractManager";
import { deployNodes } from "./tools/deploy/nodes";
import { deployValidatorService } from "./tools/deploy/delegation/validatorService";
chai.should();
chai.use(chaiAsPromised);

contract("NodesData", ([owner, validator, nodeAddress]) => {
    let contractManager: ContractManagerInstance;
    let nodes: NodesInstance;
    let validatorService: ValidatorServiceInstance;

    beforeEach(async () => {
        contractManager = await deployContractManager();
        nodes = await deployNodes(contractManager);
        validatorService = await deployValidatorService(contractManager);

        await validatorService.registerValidator("Validator", "D2", 0, 0, {from: validator});
        const validatorIndex = await validatorService.getValidatorId(validator);
        let signature1 = await web3.eth.sign(web3.utils.soliditySha3(validatorIndex.toString()), nodeAddress);
        signature1 = (signature1.slice(130) === "00" ? signature1.slice(0, 130) + "1b" :
                (signature1.slice(130) === "01" ? signature1.slice(0, 130) + "1c" : signature1));
        await validatorService.linkNodeAddress(nodeAddress, signature1, {from: validator});
    });

    it("should add node", async () => {
        const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
        await nodes.createNode(
            nodeAddress,
            {
                port: 8545,
                nonce: 0,
                ip: "0x7f000001",
                publicIp: "0x7f000002",
                publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                name: "d2"
            });

        const node = await nodes.nodes(0);

        node[0].should.be.equal("d2");
        node[1].should.be.equal("0x7f000001");
        node[2].should.be.equal("0x7f000002");
        node[3].should.be.deep.eq(web3.utils.toBN(8545));
        (await nodes.getNodePublicKey(0)).should.be.deep.equal(
            ["0x" + pubKey.x.toString('hex'),
            "0x" + pubKey.y.toString('hex')]);
        node[7].should.be.deep.eq(web3.utils.toBN(0));

        const nodeId = web3.utils.soliditySha3("d2");
        await nodes.nodesIPCheck("0x7f000001").should.be.eventually.true;
        await nodes.nodesNameCheck(nodeId).should.be.eventually.true;
        const nodeByName = await nodes.nodes(await nodes.nodesNameToIndex(nodeId));
        node.should.be.deep.equal(nodeByName);
        await nodes.isNodeExist(nodeAddress, 0).should.be.eventually.true;
        (await nodes.getActiveNodesByAddress({from: nodeAddress})).should.be.deep.equal([web3.utils.toBN(0)]);
        expect(await nodes.getActiveNodesByAddress({from: owner})).to.be.empty;
        await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        await nodes.getNumberOfNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
    });

    describe("when a node is added", async () => {
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "d2"
                });
        });

        // it("should add a fractional node", async () => {
        //     await nodes.addFractionalNode(0);

        //     const nodeFilling = await nodes.fractionalNodes(0);
        //     nodeFilling[0].should.be.deep.equal(web3.utils.toBN(0));
        //     nodeFilling[1].should.be.deep.equal(web3.utils.toBN(128));

        //     const link = await nodes.nodesLink(0);
        //     link[0].should.be.deep.equal(web3.utils.toBN(0));
        //     expect(link[1]).to.be.false;
        // });

        // it("should add a full node", async () => {
        //     await nodes.addFullNode(0);

        //     const nodeFilling = await nodes.fullNodes(0);
        //     nodeFilling[0].should.be.deep.equal(web3.utils.toBN(0));
        //     nodeFilling[1].should.be.deep.equal(web3.utils.toBN(128));

        //     const link = await nodes.nodesLink(0);
        //     link[0].should.be.deep.equal(web3.utils.toBN(0));
        //     expect(link[1]).to.be.true;
        // });

        it("should set node as leaving", async () => {
            await nodes.initExit(0);

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            await nodes.numberOfLeavingNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should set node as left one", async () => {
            await nodes.initExit(0);
            await nodes.completeExit(0);

            await nodes.nodesIPCheck("0x7f000001").should.be.eventually.false;
            await nodes.nodesNameCheck(web3.utils.soliditySha3("d2")).should.be.eventually.false;

            await nodes.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            await nodes.numberOfLeftNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should change node last reward date", async () => {
            skipTime(web3, 5);
            const res = await nodes.changeNodeLastRewardDate(0);
            const currentTimeLocal = (await web3.eth.getBlock(res.receipt.blockNumber)).timestamp;

            (await nodes.nodes(0))[5].should.be.deep.equal(web3.utils.toBN(currentTimeLocal));
            await nodes.getNodeLastRewardDate(0).should.be.eventually.deep.equal(web3.utils.toBN(currentTimeLocal));
        });

        it("should check if time for reward has come", async () => {
            // TODO: change reward period

            skipTime(web3, 3590);

            await nodes.isTimeForReward(0).should.be.eventually.false;

            skipTime(web3, 20);

            await nodes.isTimeForReward(0).should.be.eventually.true;
        });

        it("should get ip address of Node", async () => {
            await nodes.getNodeIP(0).should.be.eventually.equal("0x7f000001");
        });

        it("should get ip node's port", async () => {
            await nodes.getNodePort(0).should.be.eventually.deep.equal(web3.utils.toBN(8545));
        });

        it("should check if node status is active", async () => {
            await nodes.isNodeActive(0).should.be.eventually.true;
        });

        it("should check if node status is leaving", async () => {
            await nodes.isNodeLeaving(0).should.be.eventually.false;
        });

        it("should check if node status is left", async () => {
            await nodes.isNodeLeft(0).should.be.eventually.false;
        });

        it("should calculate node next reward date", async () => {
            let currentTimeValue = web3.utils.toBN(await currentTime(web3));
            const rewardPeriod = web3.utils.toBN(3600);
            let nextRewardTime = currentTimeValue.add(rewardPeriod);
            let obtainedNextRewardTime = web3.utils.toBN(await nodes.getNodeNextRewardDate(0));

            obtainedNextRewardTime.should.be.deep.equal(nextRewardTime);

            // test if we OK with time in the far future
            skipTime(web3, 100 * 365 * 24 * 60 * 60);
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000002",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "d3"
                });
             currentTimeValue = web3.utils.toBN(await currentTime(web3));
             nextRewardTime = currentTimeValue.add(rewardPeriod);
             obtainedNextRewardTime = web3.utils.toBN(await nodes.getNodeNextRewardDate(1));

             obtainedNextRewardTime.toString(10).should.be.equal(nextRewardTime.toString(10));
        });

        it("should get array of ips of active nodes", async () => {
            const activeNodes = await nodes.getActiveNodeIPs();

            activeNodes.length.should.be.equal(1);
            activeNodes[0].should.be.equal("0x7f000001");
        });

        it("should get array of indexes of active nodes", async () => {
            const activeNodes = await nodes.getActiveNodeIds();

            activeNodes.length.should.be.equal(1);
            const nodeIndex = web3.utils.toBN(activeNodes[0]);
            expect(nodeIndex.eq(web3.utils.toBN(0))).to.be.true;
        });

        it("should get array of indexes of active nodes of msg.sender", async () => {
            const activeNodes = await nodes.getActiveNodesByAddress({from: nodeAddress});

            activeNodes.length.should.be.equal(1);
            const nodeIndex = web3.utils.toBN(activeNodes[0]);
            expect(nodeIndex.eq(web3.utils.toBN(0))).to.be.true;
        });

        it("should return Node status", async () => {
            let status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 0);
            await nodes.initExit(0);
            status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 1);
        });

        it("should set node status In Maintenance", async () => {
            let status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 0);
            await nodes.setNodeInMaintenance(0);
            status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 3);
            const boolStatus = await nodes.isNodeInMaintenance(0);
            assert.equal(boolStatus, true);
        });

        it("should set node status From In Maintenance", async () => {
            let status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 0);
            await nodes.setNodeInMaintenance(0);
            status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 3);
            const boolStatus = await nodes.isNodeInMaintenance(0);
            assert.equal(boolStatus, true);

            await nodes.removeNodeFromInMaintenance(0);
            status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 0);
        });

        it("should node set node status In Maintenance from Leaving or Left", async () => {
            let status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 0);
            await nodes.initExit(0);
            status = await nodes.getNodeStatus(0);
            assert.equal(status.toNumber(), 1);
            await nodes.setNodeInMaintenance(0).should.be.eventually.rejectedWith("Node is not Active");
            await nodes.completeExit(0);
            await nodes.setNodeInMaintenance(0).should.be.eventually.rejectedWith("Node is not Active");
        });

        it("should decrease number of active nodes after setting node in maintenance", async () => {
            const numberOfActiveNodes = await nodes.numberOfActiveNodes();
            await nodes.setNodeInMaintenance(0);
            const numberOfActiveNodesAfter = await nodes.numberOfActiveNodes();
            assert.equal(numberOfActiveNodesAfter.toNumber(), numberOfActiveNodes.toNumber()-1);
        });

        // describe("when node is registered as fractional", async () => {
        //     beforeEach(async () => {
        //         await nodes.addFractionalNode(0);
        //     });

        //     it("should remove fractional node", async () => {
        //         await nodes.removeFractionalNode(0);

        //         await nodes.getNumberOfFractionalNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        //     });

        //     it("should remove space from fractional node", async () => {
        //         await nodes.removeSpaceFromFractionalNode(0, 2);

        //         (await nodes.fractionalNodes(0))[1].should.be.deep.equal(web3.utils.toBN(126));
        //     });

        //     it("should add space to fractional node", async () => {
        //         await nodes.addSpaceToFractionalNode(0, 2);

        //         (await nodes.fractionalNodes(0))[1].should.be.deep.equal(web3.utils.toBN(130));
        //     });

        //     it("should get number of free fractional nodes", async () => {
        //         await nodes.getNumberOfFreeFractionalNodes(128, 1).should.be.eventually.deep.equal(true);
        //     });
        // });

        // describe("when node is registered as full", async () => {
        //     beforeEach(async () => {
        //         await nodes.addFullNode(0);
        //     });

        //     it("should remove fractional node", async () => {
        //         await nodes.removeFullNode(0);

        //         await nodes.getNumberOfFullNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
        //     });

        //     it("should remove space from full node", async () => {
        //         await nodes.removeSpaceFromFullNode(0, 2);

        //         (await nodes.fullNodes(0))[1].should.be.deep.equal(web3.utils.toBN(126));
        //     });

        //     it("should add space to full node", async () => {
        //         await nodes.addSpaceToFullNode(0, 2);

        //         (await nodes.fullNodes(0))[1].should.be.deep.equal(web3.utils.toBN(130));
        //     });

        //     it("should get number of free full nodes", async () => {
        //         await nodes.getNumberOfFreeFullNodes(1).should.be.eventually.deep.equal(true);
        //     });
        // });

        describe("when node is registered", async () => {
            beforeEach(async () => {
                const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
                await nodes.createNode(
                    nodeAddress,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f000003",
                        publicIp: "0x7f000004",
                        publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                        name: "d3"
                    });
            });

            it("should remove node", async () => {
                await nodes.getNumberOnlineNodes().should.be.eventually.deep.equal(web3.utils.toBN(2));
                await nodes.initExit(0);
                await nodes.completeExit(0);
                await nodes.getNumberOnlineNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
            });

            it("should remove space from node", async () => {
                await nodes.removeSpaceFromNode(0, 2);

                (await nodes.spaceOfNodes(0))[0].should.be.deep.equal(web3.utils.toBN(126));
            });

            it("should add space to full node", async () => {
                await nodes.addSpaceToNode(0, 2);

                (await nodes.spaceOfNodes(0))[0].should.be.deep.equal(web3.utils.toBN(130));
            });

            it("should get number of free full nodes", async () => {
                await nodes.countNodesWithFreeSpace(1).should.be.eventually.deep.equal(web3.utils.toBN(2));
            });
        });

    });

    describe("when two nodes are added", async () => {
        beforeEach(async () => {
            const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000001",
                    publicIp: "0x7f000001",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "d1"
                });
            await nodes.createNode(
                nodeAddress,
                {
                    port: 8545,
                    nonce: 0,
                    ip: "0x7f000002",
                    publicIp: "0x7f000002",
                    publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                    name: "d2"
                });
        });

        // describe("when nodes are registered as fractional", async () => {
        //     beforeEach(async () => {
        //         await nodes.addFractionalNode(0);
        //         await nodes.addFractionalNode(1);
        //     });

        //     it("should remove first fractional node", async () => {
        //         await nodes.removeFractionalNode(0);

        //         await nodes.getNumberOfFractionalNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        //     });

        //     it("should remove second fractional node", async () => {
        //         await nodes.removeFractionalNode(1);

        //         await nodes.getNumberOfFractionalNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        //     });

        //     it("should not remove larger space from fractional node than its has", async () => {
        //         const nodesFillingBefore = await nodes.fractionalNodes(0);
        //         const spaceBefore = nodesFillingBefore["1"];
        //         await nodes.removeSpaceFromFractionalNode(0, 129);
        //         const nodesFillingAfter = await nodes.fractionalNodes(0);
        //         const spaceAfter = nodesFillingAfter["1"];
        //         parseInt(spaceBefore.toString(), 10).should.be.equal(parseInt(spaceAfter.toString(), 10));
        //     });
        // });

        describe("when nodes are registered", async () => {
            beforeEach(async () => {
                const pubKey = ec.keyFromPrivate(String(privateKeys[2]).slice(2)).getPublic();
                await nodes.createNode(
                    nodeAddress,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f000003",
                        publicIp: "0x7f000003",
                        publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                        name: "d3"
                    });
                await nodes.createNode(
                    nodeAddress,
                    {
                        port: 8545,
                        nonce: 0,
                        ip: "0x7f000004",
                        publicIp: "0x7f000004",
                        publicKey: ["0x" + pubKey.x.toString('hex'), "0x" + pubKey.y.toString('hex')],
                        name: "d4"
                    });
            });

            it("should remove first node", async () => {
                await nodes.initExit(0);
                await nodes.completeExit(0);
                await nodes.getNumberOnlineNodes().should.be.eventually.deep.equal(web3.utils.toBN(3));
            });

            it("should remove second node", async () => {
                await nodes.initExit(1);
                await nodes.completeExit(1);
                await nodes.getNumberOnlineNodes().should.be.eventually.deep.equal(web3.utils.toBN(3));
            });

            it("should not remove larger space from full node than its has", async () => {
                const nodesFillingBefore = await nodes.spaceOfNodes(0);
                const spaceBefore = nodesFillingBefore["0"];
                await nodes.removeSpaceFromNode(0, 129);
                const nodesFillingAfter = await nodes.spaceOfNodes(0);
                const spaceAfter = nodesFillingAfter["0"];
                parseInt(spaceBefore.toString(), 10).should.be.equal(parseInt(spaceAfter.toString(), 10));
            });

        });

    });

});
