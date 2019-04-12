pragma solidity ^0.4.24;

import './Permissions.sol';


contract GroupsData is Permissions {

    struct GroupCheck {
        mapping (uint => bool) check;
    }

    struct Group {
        bool active;
        bytes32 groupData;
        uint[] nodesInGroup;
        uint recommendedNumberOfNodes;
        //uint numberOfExceptionNodes;
        uint[4] groupsPublicKey;
    }

    mapping (bytes32 => Group) public groups;
    mapping (bytes32 => GroupCheck) exceptions;

    string executorName;

    constructor(string newExecutorName, address newContractsAddress) public Permissions(newContractsAddress) {
        executorName = newExecutorName;
    }

    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) public allow(executorName) {
        groups[groupIndex].active = true;
        groups[groupIndex].recommendedNumberOfNodes = amountOfNodes;
        groups[groupIndex].groupData = data;
    }

    function setException(bytes32 groupIndex, uint nodeIndex) public allow(executorName) {
        exceptions[groupIndex].check[nodeIndex] = true;
    }

    function setPublicKey(bytes32 groupIndex, uint publicKeyx1, uint publicKeyy1, uint publicKeyx2, uint publicKeyy2) public allow("SkaleDKG") {
        groups[groupIndex].groupsPublicKey[0] = publicKeyx1;
        groups[groupIndex].groupsPublicKey[1] = publicKeyy1;
        groups[groupIndex].groupsPublicKey[2] = publicKeyx2;
        groups[groupIndex].groupsPublicKey[3] = publicKeyy2;
    }

    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) public allow(executorName) {
        groups[groupIndex].nodesInGroup.push(nodeIndex);
    }

    function removeAllNodesInGroup(bytes32 groupIndex) public allow(executorName) {
        delete groups[groupIndex].nodesInGroup;
        groups[groupIndex].nodesInGroup.length = 0;
    }

    function setNodesInGroup(bytes32 groupIndex, uint[] nodesInGroup) public allow(executorName) {
        groups[groupIndex].nodesInGroup = nodesInGroup;
    }

    function setNewAmountOfNodes(bytes32 groupIndex, uint amountOfNodes) public allow(executorName) {
        groups[groupIndex].recommendedNumberOfNodes = amountOfNodes;
    }

    function setNewGroupData(bytes32 groupIndex, bytes32 data) public allow(executorName) {
        groups[groupIndex].groupData = data;
    }

    function removeGroup(bytes32 groupIndex) public allow(executorName) {
        groups[groupIndex].active = false;
        delete groups[groupIndex].groupData;
        delete groups[groupIndex].recommendedNumberOfNodes;
    }

    function removeExceptionNode(bytes32 groupIndex, uint nodeIndex) public allow(executorName) {
        exceptions[groupIndex].check[nodeIndex] = false;
    }

    function isGroupActive(bytes32 groupIndex) public view returns (bool) {
        return groups[groupIndex].active;
    }

    function isExceptionNode(bytes32 groupIndex, uint nodeIndex) public view returns (bool) {
        return exceptions[groupIndex].check[nodeIndex];
    }

    function getGroupsPublicKey(bytes32 groupIndex) public view returns (uint, uint, uint, uint) {
        return (groups[groupIndex].groupsPublicKey[0], groups[groupIndex].groupsPublicKey[1], groups[groupIndex].groupsPublicKey[2], groups[groupIndex].groupsPublicKey[3]);
    }

    function getNodesInGroup(bytes32 groupIndex) public view returns (uint[]) {
        return groups[groupIndex].nodesInGroup;
    }

    function getGroupData(bytes32 groupIndex) public view returns (bytes32) {
        return groups[groupIndex].groupData;
    }

    function getRecommendedNumberOfNodes(bytes32 groupIndex) public view returns (uint) {
        return groups[groupIndex].recommendedNumberOfNodes;
    }

    function getNumberOfNodesInGroup(bytes32 groupIndex) public view returns (uint) {
        return groups[groupIndex].nodesInGroup.length;
    }
}
