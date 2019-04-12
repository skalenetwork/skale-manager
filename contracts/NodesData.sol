pragma solidity ^0.4.24;

import "./Permissions.sol";

interface Constants {
    function rewardPeriod() external view returns (uint32);
}


contract NodesData is Permissions {

    enum NodeStatus {Active, Leaving, Left}

    struct Node {
        string name;
        bytes4 ip;
        bytes4 publicIP;
        uint16 port;
        //address owner;
        bytes publicKey;
        uint32 startDate;
        uint32 leavingDate;
        uint32 lastRewardDate;
        //address secondAddress;
        NodeStatus status;
    }

    struct CreatedNodes {
        mapping (uint => bool) isNodeExist;
        uint numberOfNodes;
    }

    struct NodeLink {
        uint subarrayLink;
        bool isNodeFull;
    }

    struct NodeFilling {
        uint nodeIndex;
        uint freeSpace;
    }

    Node[] public nodes;
    NodeLink[] public nodesLink;
    mapping (address => CreatedNodes) public nodeIndexes;
    mapping (bytes4 => bool) public nodesIPCheck;
    mapping (bytes32 => bool) public nodesNameCheck;

    NodeFilling[] public fractionalNodes;
    NodeFilling[] public fullNodes;

    uint leavingPeriod;

    uint public numberOfActiveNodes = 0;
    uint public numberOfLeavingNodes = 0;
    uint public numberOfLeftNodes = 0;

    constructor(uint newLeavingPeriod, address newContractsAddress) Permissions(newContractsAddress) public {
        leavingPeriod = newLeavingPeriod;
    }

    function addNode(address from, string name, bytes4 ip, bytes4 publicIP, uint16 port, bytes publicKey) public allow("NodesFunctionality") returns (uint) {
        nodes.push(Node({
            name: name,
            ip: ip,
            publicIP: publicIP,
            port: port,
            publicKey: publicKey,
            startDate: uint32(block.timestamp),
            leavingDate: uint32(0),
            lastRewardDate: uint32(block.timestamp),
            status: NodeStatus.Active
        }));
        bytes32 nodeId = keccak256(abi.encodePacked(name));
        nodesIPCheck[ip] = true;
        nodesNameCheck[nodeId] = true;
        nodeIndexes[from].isNodeExist[nodes.length - 1] = true;
        nodeIndexes[from].numberOfNodes++;
        numberOfActiveNodes++;
        return nodes.length - 1;
    }

    function addFractionalNode(uint nodeIndex) public allow("NodesFunctionality") {
        fractionalNodes.push(NodeFilling({
            nodeIndex: nodeIndex,
            freeSpace: 128
        }));
        nodesLink.push(NodeLink({
            subarrayLink: fractionalNodes.length - 1,
            isNodeFull: false
        }));
    }

    function addFullNode(uint nodeIndex) public allow("NodesFunctionality") {
        fullNodes.push(NodeFilling({
            nodeIndex: nodeIndex,
            freeSpace: 1
        }));
        nodesLink.push(NodeLink({
            subarrayLink: fullNodes.length - 1,
            isNodeFull: true
        }));
    }

    function setNodeLeaving(uint nodeIndex) public allow("NodesFunctionality") {
        nodes[nodeIndex].status = NodeStatus.Leaving;
        nodes[nodeIndex].leavingDate = uint32(block.timestamp);
        numberOfActiveNodes--;
        numberOfLeavingNodes++;
    }

    function setNodeLeft(uint nodeIndex) public allow("NodesFunctionality") {
        //nodes[nodeIndex].status = NodeStatus.Left;
        nodesIPCheck[nodes[nodeIndex].ip] = false;
        nodesNameCheck[keccak256(abi.encodePacked(nodes[nodeIndex].name))] = false;
        if (nodes[nodeIndex].status == NodeStatus.Active) {
            numberOfActiveNodes--;
        } else {
            numberOfLeavingNodes--;
        }
        numberOfLeftNodes++;
    }

    function removeFractionalNode(uint subarrayIndex) public allow("NodesFunctionality") {
        if (subarrayIndex != fractionalNodes.length - 1) {
            uint secondNodeIndex = fractionalNodes[fractionalNodes.length - 1].nodeIndex;
            fractionalNodes[subarrayIndex] = fractionalNodes[fractionalNodes.length - 1];
            nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
        }
        delete fractionalNodes[fractionalNodes.length - 1];
    }

    function removeFullNode(uint subarrayIndex) public allow("NodesFunctionality") {
        if (subarrayIndex != fullNodes.length - 1) {
            uint secondNodeIndex = fullNodes[fullNodes.length - 1].nodeIndex;
            fullNodes[subarrayIndex] = fullNodes[fullNodes.length - 1];
            nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
        }
        delete fullNodes[fullNodes.length - 1];
    }

    function removeSpaceFromFractionalNode(uint subarrayLink, uint space) public allow("SchainsFunctionality") returns (bool) {
        if (fractionalNodes[subarrayLink].freeSpace < space) {
            return false;
        }
        fractionalNodes[subarrayLink].freeSpace -= space;
        return true;
    }

    function removeSpaceFromFullNode(uint subarrayLink, uint space) public allow("SchainsFunctionality") returns (bool) {
        if (fullNodes[subarrayLink].freeSpace < space) {
            return false;
        }
        fullNodes[subarrayLink].freeSpace -= space;
        return true;
    }

    function addSpaceToFractionalNode(uint subarrayLink, uint space) public allow("SchainsFunctionality") {
        fractionalNodes[subarrayLink].freeSpace += space;
    }

    function addSpaceToFullNode(uint subarrayLink, uint space) public allow("SchainsFunctionality") {
        fullNodes[subarrayLink].freeSpace += space;
    }

    function changeNodeLastRewardDate(uint nodeIndex) public allow("SkaleManager") {
        nodes[nodeIndex].lastRewardDate = uint32(block.timestamp);
    }

    function isNodeExist(address from, uint nodeIndex) public view returns (bool) {
        return nodeIndexes[from].isNodeExist[nodeIndex];
    }

    function isLeavingPeriodExpired(uint nodeIndex) public view returns (bool) {
        return block.timestamp - nodes[nodeIndex].leavingDate >= leavingPeriod;
    }

    function isTimeForReward(uint nodeIndex) public view returns (bool) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        return nodes[nodeIndex].lastRewardDate + Constants(constantsAddress).rewardPeriod() <= block.timestamp;
    }

    function getNodeIP(uint nodeIndex) public view returns (bytes4) {
        return nodes[nodeIndex].ip;
    }

    function getNodePort(uint nodeIndex) public view returns (uint16) {
        return nodes[nodeIndex].port;
    }

    function isNodeActive(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Active;
    }

    function isNodeLeaving(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Leaving;
    }

    function isNodeLeft(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Left;
    }

    function getNodeLastRewardDate(uint nodeIndex) public view returns (uint32) {
        return nodes[nodeIndex].lastRewardDate;
    }

    function getNodeNextRewardDate(uint nodeIndex) public view returns (uint32) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        return nodes[nodeIndex].lastRewardDate + Constants(constantsAddress).rewardPeriod();
    }

    function getNumberOfNodes() public view returns (uint) {
        return nodes.length;
    }

    function getNumberOfFractionalNodes() public view returns (uint) {
        return fractionalNodes.length;
    }

    function getNumberOfFullNodes() public view returns (uint) {
        return fullNodes.length;
    }

    function getNumberOfFreeFractionalNodes(uint space) public view returns (uint numberOfFreeFractionalNodes) {
        for (uint indexOfNode = 0; indexOfNode < fractionalNodes.length; indexOfNode++) {
            if (fractionalNodes[indexOfNode].freeSpace >= space && isNodeActive(fractionalNodes[indexOfNode].nodeIndex)) {
                numberOfFreeFractionalNodes++;
            }
        }
    }

    function getNumberOfFreeFullNodes() public view returns (uint numberOfFreeFullNodes) {
        for (uint indexOfNode = 0; indexOfNode < fullNodes.length; indexOfNode++) {
            if (fullNodes[indexOfNode].freeSpace == 1 && isNodeActive(fullNodes[indexOfNode].nodeIndex)) {
                numberOfFreeFullNodes++;
            }
        }
    }

    function getActiveNodeIPs() public view returns (bytes4[] memory activeNodeIPs) {        
        activeNodeIPs = new bytes4[](numberOfActiveNodes);
        uint indexOfActiveNodeIPs = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (isNodeActive(indexOfNodes)) {
                activeNodeIPs[indexOfActiveNodeIPs] = nodes[indexOfNodes].ip;
                indexOfActiveNodeIPs++;
            }
        }             
    }

    function getActiveNodeIds() public view returns (uint[] memory activeNodeIds) {
        activeNodeIds = new uint[](numberOfActiveNodes);
        uint indexOfActiveNodeIds = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (isNodeActive(indexOfNodes)) {
                activeNodeIds[indexOfActiveNodeIds] = indexOfNodes;
                indexOfActiveNodeIds++;                                                               
            }                                   
        }            
    }

    function getActiveNodesByAddress() public view returns (uint[] memory activeNodesByAddress) {
        activeNodesByAddress = new uint[](nodeIndexes[msg.sender].numberOfNodes);
        uint indexOfActiveNodesByAddress = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (nodeIndexes[msg.sender].isNodeExist[indexOfNodes] && isNodeActive(indexOfNodes)) {
                activeNodesByAddress[indexOfActiveNodesByAddress] = indexOfNodes;
                indexOfActiveNodesByAddress++;
            }
        }             
    }
}
