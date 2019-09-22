import BigNumber from "bignumber.js";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { ContractManagerContract, ContractManagerInstance,
    GroupsDataContract, GroupsDataInstance, SkaleDKGContract,
    SkaleDKGInstance } from "../types/truffle-contracts";

const GroupsData: GroupsDataContract = artifacts.require("./GroupsData");
const ContractManager: ContractManagerContract = artifacts.require("./ContractManager");
const SkaleDKG: SkaleDKGContract = artifacts.require("./SkaleDKG");

chai.should();
chai.use(chaiAsPromised);

contract("GroupsData", ([user, owner]) => {
    let groupsData: GroupsDataInstance;
    let contractManager: ContractManagerInstance;
    let skaleDKG: SkaleDKGInstance;

    beforeEach(async () => {
        contractManager = await ContractManager.new({from: owner});
        groupsData = await GroupsData.new("GroupsFuctionality", contractManager.address, {from: owner});
        skaleDKG = await SkaleDKG.new(contractManager.address, {from: owner, gas: 8000000});
        await contractManager.setContractsAddress("SkaleDKG", skaleDKG.address);
    });

    it("should add group from valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("2");
        const amountOfNodes = 2;
        await groupsData.addGroup(groupIndex, amountOfNodes, data, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.addGroup(groupIndex, amountOfNodes, data, {from: owner});
        const isGroupActive = await groupsData.isGroupActive(groupIndex);
        expect(isGroupActive).to.be.true;
        const groupData = await groupsData.getGroupData(groupIndex);
        groupData.should.be.deep.equal(web3.utils.soliditySha3(2));

    });

    it("should set exeption by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        await groupsData.setException(groupIndex, nodeIndex, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setException(groupIndex, nodeIndex, {from: owner});
        const isExeptionNode = await groupsData.isExceptionNode(groupIndex, nodeIndex);
        expect(isExeptionNode).to.be.true;
    });

    it("should set public key by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const publicKeyx1 = 1;
        const publicKeyy1 = 2;
        const publicKeyx2 = 3;
        const publicKeyy2 = 4;
        await groupsData.setPublicKey(groupIndex, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setPublicKey(groupIndex, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2, {from: owner});
        const groupsPublicKey = await groupsData.getGroupsPublicKey(groupIndex);
        groupsPublicKey[0].should.be.deep.equal(web3.utils.toBN(1));
        groupsPublicKey[1].should.be.deep.equal(web3.utils.toBN(2));
        groupsPublicKey[2].should.be.deep.equal(web3.utils.toBN(3));
        groupsPublicKey[3].should.be.deep.equal(web3.utils.toBN(4));
    });

    it("should set node in grop by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        await groupsData.setNodeInGroup(groupIndex, nodeIndex, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setNodeInGroup(groupIndex, nodeIndex, {from: owner});
        const numberOfNodesInGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroup.should.be.deep.equal(web3.utils.toBN(1));
        const nodesInGroup = await groupsData.getNodesInGroup(groupIndex);
        nodesInGroup.should.be.deep.equal([web3.utils.toBN(0)]);
    });

    it("should remove all nodes in group by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodeIndex1 = 0;
        const nodeIndex2 = 1;
        const nodeIndex3 = 2;
        const nodeIndex4 = 3;
        const numberOfNodesInGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroup.should.be.deep.equal(web3.utils.toBN(0));
        await groupsData.setNodeInGroup(groupIndex, nodeIndex1, {from: owner});
        await groupsData.setNodeInGroup(groupIndex, nodeIndex2, {from: owner});
        await groupsData.setNodeInGroup(groupIndex, nodeIndex3, {from: owner});
        await groupsData.setNodeInGroup(groupIndex, nodeIndex4, {from: owner});
        const numberOfNodesInFullGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInFullGroup.should.be.deep.equal(web3.utils.toBN(4));
        await groupsData.removeAllNodesInGroup(groupIndex, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.removeAllNodesInGroup(groupIndex, {from: owner});
        const numberOfNodesInEmptyGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInEmptyGroup.should.be.deep.equal(web3.utils.toBN(0));
    });

    it("sould set nodes in group by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodesInGroup = [2, 3];
        const numberOfNodesInGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroup.should.be.deep.equal(web3.utils.toBN(0));
        await groupsData.setNodesInGroup(groupIndex, nodesInGroup, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setNodesInGroup(groupIndex, nodesInGroup, {from: owner});
        const numberOfNodesInGroupAfter = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroupAfter.should.be.deep.equal(web3.utils.toBN(2));
        const gottenNodesInGroup = await groupsData.getNodesInGroup(groupIndex);
        gottenNodesInGroup[0].should.be.deep.equal(web3.utils.toBN(2));
        gottenNodesInGroup[1].should.be.deep.equal(web3.utils.toBN(3));
    });

    it("should set new recommended amount of nodes in group by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const amountOfNodes = 20;
        const anotherAmountOfNodes = 4;
        const recommendedNumberOfNodes = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodes.should.be.deep.equal(web3.utils.toBN(0));
        await groupsData.setNewAmountOfNodes(groupIndex, amountOfNodes, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setNewAmountOfNodes(groupIndex, amountOfNodes, {from: owner});
        const recommendedNumberOfNodesAfter = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodesAfter.should.be.deep.equal(web3.utils.toBN(20));
        await groupsData.setNewAmountOfNodes(groupIndex, anotherAmountOfNodes, {from: owner});
        const recommendedNumberOfNodesFinal = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodesFinal.should.be.deep.equal(web3.utils.toBN(4));
    });

    it("should set new group data by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("2");
        const newData = web3.utils.soliditySha3("4");
        const groupData0 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData0.should.be.deep.equal(web3.utils.toBN("0"));
        await groupsData.setNewGroupData(groupIndex, data, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.setNewGroupData(groupIndex, data, {from: owner});
        const groupData1 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData1.should.be.deep.equal(web3.utils.toBN(data));
        await groupsData.setNewGroupData(groupIndex, newData, {from: owner});
        const groupData2 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData2.should.be.deep.equal(web3.utils.toBN(newData));
    });

    it("should remove group by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("55");
        const amountOfNodes = 20;
        await groupsData.addGroup(groupIndex, amountOfNodes, data, {from: owner});
        const isGroupActive = await groupsData.isGroupActive(groupIndex);
        expect(isGroupActive).to.be.true;
        const groupData1 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData1.should.be.deep.equal(web3.utils.toBN(data));
        const recommendedNumberOfNodes = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodes.should.be.deep.equal(web3.utils.toBN(20));
        await groupsData.removeGroup(groupIndex, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.removeGroup(groupIndex, {from: owner});
        const groupInactive = await groupsData.isGroupActive(groupIndex);
        expect(groupInactive).to.be.false;
        const groupData0 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData0.should.be.deep.equal(web3.utils.toBN("0"));
        const recommendedNumberOfNodesAfter = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodesAfter.should.be.deep.equal(web3.utils.toBN(0));
    });

    it("should remove exeption node by valid message sender", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        await groupsData.setException(groupIndex, nodeIndex, {from: owner});
        const isExeptionNode = await groupsData.isExceptionNode(groupIndex, nodeIndex);
        expect(isExeptionNode).to.be.true;
        await groupsData.removeExceptionNode(groupIndex, nodeIndex, {from: user}).
        should.be.rejectedWith("Message sender is invalid");
        await groupsData.removeExceptionNode(groupIndex, nodeIndex, {from: owner});
        const isExeptionNodeAfter = await groupsData.isExceptionNode(groupIndex, nodeIndex);
        expect(isExeptionNodeAfter).to.be.false;
    });

    it("should check is group active", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("55");
        const amountOfNodes = 20;
        await groupsData.addGroup(groupIndex, amountOfNodes, data, {from: owner});
        const isGroupActive = await groupsData.isGroupActive(groupIndex);
        expect(isGroupActive).to.be.true;
        await groupsData.removeGroup(groupIndex, {from: owner});
        const groupInactive = await groupsData.isGroupActive(groupIndex);
        expect(groupInactive).to.be.false;
    });

    it("should check is exception node", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodeIndex = 0;
        await groupsData.setException(groupIndex, nodeIndex, {from: owner});
        const isExeptionNode = await groupsData.isExceptionNode(groupIndex, nodeIndex);
        expect(isExeptionNode).to.be.true;
        await groupsData.removeExceptionNode(groupIndex, nodeIndex, {from: owner});
        const isExeptionNodeAfter = await groupsData.isExceptionNode(groupIndex, nodeIndex);
        expect(isExeptionNodeAfter).to.be.false;
    });

    it("should get groups public key", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const publicKeyx1 = 11;
        const publicKeyy1 = 22;
        const publicKeyx2 = 33;
        const publicKeyy2 = 44;
        await groupsData.setPublicKey(groupIndex, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2, {from: owner});
        const groupsPublicKey = await groupsData.getGroupsPublicKey(groupIndex);
        groupsPublicKey[0].should.be.deep.equal(web3.utils.toBN(11));
        groupsPublicKey[1].should.be.deep.equal(web3.utils.toBN(22));
        groupsPublicKey[2].should.be.deep.equal(web3.utils.toBN(33));
        groupsPublicKey[3].should.be.deep.equal(web3.utils.toBN(44));
    });

    it("sould get nodes in group", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodesInGroup = [65, 38];
        await groupsData.setNodesInGroup(groupIndex, nodesInGroup, {from: owner});
        const gottenNodesInGroup = await groupsData.getNodesInGroup(groupIndex);
        gottenNodesInGroup[0].should.be.deep.equal(web3.utils.toBN(65));
        gottenNodesInGroup[1].should.be.deep.equal(web3.utils.toBN(38));
    });

    it("should get group data", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const data = web3.utils.soliditySha3("2");
        const groupData0 = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData0.should.be.deep.equal(web3.utils.toBN("0"));
        await groupsData.setNewGroupData(groupIndex, data, {from: owner});
        const groupData = web3.utils.toBN(await groupsData.getGroupData(groupIndex));
        groupData.should.be.deep.equal(web3.utils.toBN(data));
    });

    it("should get recommended number of nodes in group", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const amountOfNodes = 20;
        const anotherAmountOfNodes = 4;
        const data = web3.utils.soliditySha3("55");
        const recommendedNumberOfNodes = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodes.should.be.deep.equal(web3.utils.toBN(0));
        await groupsData.setNewAmountOfNodes(groupIndex, amountOfNodes, {from: owner});
        const recommendedNumberOfNodesAfter = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodesAfter.should.be.deep.equal(web3.utils.toBN(20));
        await groupsData.addGroup(groupIndex, anotherAmountOfNodes, data, {from: owner});
        const recommendedNumberOfNodesFinal = await groupsData.getRecommendedNumberOfNodes(groupIndex);
        recommendedNumberOfNodesFinal.should.be.deep.equal(web3.utils.toBN(4));
    });

    it("sould get number of nodes in group", async () => {
        const groupIndex = web3.utils.soliditySha3("1");
        const nodesInGroup = [2, 3];
        const numberOfNodesInGroup = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroup.should.be.deep.equal(web3.utils.toBN(0));
        await groupsData.setNodesInGroup(groupIndex, nodesInGroup, {from: owner});
        const numberOfNodesInGroupAfter = await groupsData.getNumberOfNodesInGroup(groupIndex);
        numberOfNodesInGroupAfter.should.be.deep.equal(web3.utils.toBN(2));
    });
});
