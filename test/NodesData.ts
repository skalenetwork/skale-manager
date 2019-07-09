import { ContractManagerContract,
    ContractManagerInstance,
    NodesDataContract,
    NodesDataInstance,
    ConstantsHolderContract,
    ConstantsHolderInstance} from "../types/truffle-contracts";

const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const NodesData: NodesDataContract = artifacts.require("./NodesData");
const ConstantsHolder: ConstantsHolderContract = artifacts.require('./ConstantsHolder')

import chai = require("chai");
import * as chaiAsPromised from "chai-as-promised";
chai.should();
chai.use(chaiAsPromised);
import { skipTime } from './utils/time'

contract("NodesData", ([owner, validator]) => {
    let contractManager: ContractManagerInstance;
    let nodesData: NodesDataInstance;
    let constantsHolder: ConstantsHolderInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        nodesData = await NodesData.new(5, contractManager.address, {from: owner});

        constantsHolder = await ConstantsHolder.new(
            contractManager.address, 
            {from: owner, gas: 8000000}
        );
        await contractManager.setContractsAddress("Constants", constantsHolder.address);
    });

    it("should add node", async () => {
        await nodesData.addNode(validator, "d2", "0x7f000001", "0x7f000002", 8545, "0x1122334455");        

        let _node = await nodesData.nodes(0);        

        _node[0].should.be.equal("d2");
        _node[1].should.be.equal("0x7f000001");
        _node[2].should.be.equal("0x7f000002");
        _node[3].should.be.deep.eq(web3.utils.toBN(8545));
        _node[4].should.be.equal("0x1122334455");
        _node[6].should.be.deep.eq(web3.utils.toBN(0));
        _node[8].should.be.deep.eq(web3.utils.toBN(0));

        let nodeId = web3.utils.soliditySha3("d2");
        await nodesData.nodesIPCheck("0x7f000001").should.be.eventually.true;
        await nodesData.nodesNameCheck(nodeId).should.be.eventually.true;
        let _nodeByName = await nodesData.nodes(await nodesData.nodesNameToIndex(nodeId));
        _node.should.be.deep.equal(_nodeByName);
        await nodesData.isNodeExist(validator, 0).should.be.eventually.true;
        (await nodesData.getActiveNodesByAddress({from: validator})).should.be.deep.equal([web3.utils.toBN(0)]);
        (await nodesData.getActiveNodesByAddress({from: owner})).should.be.empty;
        await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        await nodesData.getNumberOfNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
    });    

    describe("when a node is added", async () => {
        beforeEach(async () => {
            await nodesData.addNode(validator, "d2", "0x7f000001", "0x7f000002", 8545, "0x1122334455");
        })

        it("should add a fractional node", async () => {
            await nodesData.addFractionalNode(0);

            let nodeFilling = await nodesData.fractionalNodes(0);
            nodeFilling[0].should.be.deep.equal(web3.utils.toBN(0));
            nodeFilling[1].should.be.deep.equal(web3.utils.toBN(128));            

            let link = await nodesData.nodesLink(0);
            link[0].should.be.deep.equal(web3.utils.toBN(0));
            link[1].should.be.false;
        })

        it("should add a full node", async () => {
            await nodesData.addFullNode(0);

            let nodeFilling = await nodesData.fullNodes(0);
            nodeFilling[0].should.be.deep.equal(web3.utils.toBN(0));
            nodeFilling[1].should.be.deep.equal(web3.utils.toBN(128));            

            let link = await nodesData.nodesLink(0);
            link[0].should.be.deep.equal(web3.utils.toBN(0));
            link[1].should.be.true;
        })

        it('should set node as leaving', async () => {
            await nodesData.setNodeLeaving(0);

            (await nodesData.nodes(0))[8].should.be.deep.equal(web3.utils.toBN(1));
            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            await nodesData.numberOfLeavingNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it('should set node as left one', async () => {
            await nodesData.setNodeLeft(0);

            await nodesData.nodesIPCheck("0x7f000001").should.be.eventually.false;
            await nodesData.nodesNameCheck(web3.utils.soliditySha3("d2")).should.be.eventually.false;
            
            await nodesData.numberOfActiveNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            await nodesData.numberOfLeftNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
        });

        it("should change node last reward date", async () => {            
            skipTime(web3, 5);           
            let currentTime = (await web3.eth.getBlock("latest")).timestamp;

            await nodesData.changeNodeLastRewardDate(0);

            (await nodesData.nodes(0))[7].should.be.deep.equal(web3.utils.toBN(currentTime));
            await nodesData.getNodeLastRewardDate(0).should.be.eventually.deep.equal(web3.utils.toBN(currentTime));
        });

        it("should check if leaving period is expired", async () => {
            await nodesData.setNodeLeaving(0);
    
            skipTime(web3, 4);
    
            await nodesData.isLeavingPeriodExpired(0).should.be.eventually.false;

            skipTime(web3, 1);

            await nodesData.isLeavingPeriodExpired(0).should.be.eventually.true;
        });

        it("should check if time for reward has come", async () => {
            // TODO: change rewart period

            skipTime(web3, 599);

            await nodesData.isTimeForReward(0).should.be.eventually.false;

            skipTime(web3, 1);

            await nodesData.isTimeForReward(0).should.be.eventually.true;
        });

        it("should get ip address of Node", async () => {
            await nodesData.getNodeIP(0).should.be.eventually.equal("0x7f000001");
        });

        it("should get ip node's port", async () => {
            await nodesData.getNodePort(0).should.be.eventually.deep.equal(web3.utils.toBN(8545));
        });

        it("should check if node status is active", async () => {
            await nodesData.isNodeActive(0).should.be.eventually.true;
        });
        
        it("should check if node status is leaving", async () => {
            await nodesData.isNodeLeaving(0).should.be.eventually.false;
        });

        it("should check if node status is left", async () => {
            await nodesData.isNodeLeft(0).should.be.eventually.false;
        });

        it("should calculate node next reward date", async () => {
            let currentTime = web3.utils.toBN((await web3.eth.getBlock("latest")).timestamp);
            let rewardPeriod = web3.utils.toBN(600);
            let nextRewardTime = currentTime.add(rewardPeriod);
            let _nextRewardTime = web3.utils.toBN(await nodesData.getNodeNextRewardDate(0));

            _nextRewardTime.should.be.deep.equal(nextRewardTime);            
        });

        it("should get array of ips of active nodes", async () => {
            let active_nodes = await nodesData.getActiveNodeIPs();

            active_nodes.length.should.be.equal(1);
            active_nodes[0].should.be.equal("0x7f000001");
        });

        it("should get array of indexes of active nodes", async () => {
            let active_nodes = await nodesData.getActiveNodeIds();

            active_nodes.length.should.be.equal(1);
            let node_index = web3.utils.toBN(active_nodes[0]);            
            expect(node_index.eq(web3.utils.toBN(0))).to.be.true;
        })

        it("should get array of indexes of active nodes of msg.sender", async () => {
            let active_nodes = await nodesData.getActiveNodesByAddress({from: validator});

            active_nodes.length.should.be.equal(1);
            let node_index = web3.utils.toBN(active_nodes[0]);            
            expect(node_index.eq(web3.utils.toBN(0))).to.be.true;
        });

        describe("when node is registered as fractional", async () => {
            beforeEach(async () => {
                await nodesData.addFractionalNode(0);
            })

            it("should remove fractional node", async () => {
                await nodesData.removeFractionalNode(0);

                await nodesData.getNumberOfFractionalNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            });

            it("should remove space from fractional node", async () => {
                await nodesData.removeSpaceFromFractionalNode(0, 2);

                (await nodesData.fractionalNodes(0))[1].should.be.deep.equal(web3.utils.toBN(126));
            });

            it("should add space to fractional node", async () => {
                await nodesData.addSpaceToFractionalNode(0, 2);

                (await nodesData.fractionalNodes(0))[1].should.be.deep.equal(web3.utils.toBN(130));
            });

            it("should get number of free fractional nodes", async () => {
                await nodesData.getNumberOfFreeFractionalNodes(128).should.be.eventually.deep.equal(web3.utils.toBN(1));
            });
        });

        describe("when node is registered as full", async () => {
            beforeEach(async () => {
                await nodesData.addFullNode(0);
            })

            it("should remove fractional node", async () => {
                await nodesData.removeFullNode(0);

                await nodesData.getNumberOfFullNodes().should.be.eventually.deep.equal(web3.utils.toBN(0));
            });

            it("should remove space from full node", async () => {
                await nodesData.removeSpaceFromFullNode(0, 2);

                (await nodesData.fullNodes(0))[1].should.be.deep.equal(web3.utils.toBN(126));
            });

            it("should add space to full node", async () => {
                await nodesData.addSpaceToFullNode(0, 2);

                (await nodesData.fullNodes(0))[1].should.be.deep.equal(web3.utils.toBN(130));
            });

            it("should get number of free full nodes", async () => {
                await nodesData.getNumberOfFreeFullNodes().should.be.eventually.deep.equal(web3.utils.toBN(1));
            });
        });

    });
    
});