/*
    NodesData.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin

    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.5.0;

import "./Permissions.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/INodesData.sol";


/**
 * @title NodesData - Data contract for NodesFunctionality
 */
contract NodesData is INodesData, Permissions {

    // All Nodes states
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

    // struct to note which Nodes and which number of Nodes owned by user
    struct CreatedNodes {
        mapping (uint => bool) isNodeExist;
        uint numberOfNodes;
    }

    // struct to note Full or Fractional Node and link to subarray
    struct NodeLink {
        uint subarrayLink;
        bool isNodeFull;
    }

    // struct to note nodeIndex and remaining space
    struct NodeFilling {
        uint nodeIndex;
        uint freeSpace;
    }

    // array which contain all Nodes
    Node[] public nodes;
    // array which contain links to subarrays of Fractional and Full Nodes
    NodeLink[] public nodesLink;
    // mapping for checking which Nodes and which number of Nodes owned by user
    mapping (address => CreatedNodes) public nodeIndexes;
    // mapping for checking is IP address busy
    mapping (bytes4 => bool) public nodesIPCheck;
    // mapping for checking is Name busy
    mapping (bytes32 => bool) public nodesNameCheck;
    // mapping for indication from Name to Index
    mapping (bytes32 => uint) public nodesNameToIndex;
    // mapping of trusted validators
    mapping (address => bool) public trustedValidators;

    // array which contain only Fractional Nodes
    NodeFilling[] public fractionalNodes;
    // array which contain only Full Nodes
    NodeFilling[] public fullNodes;

    // leaving Period for Node
    uint leavingPeriod;

    uint public numberOfActiveNodes = 0;
    uint public numberOfLeavingNodes = 0;
    uint public numberOfLeftNodes = 0;

    constructor(uint newLeavingPeriod, address newContractsAddress) Permissions(newContractsAddress) public {
        leavingPeriod = newLeavingPeriod;
    }

    function getNodesWithFreeSpace(uint partOfNode, uint freeSpace) external view returns (uint[] memory) {
        if (freeSpace == 0) {
            return getActiveNodeIds();
        }
        if (partOfNode > 1) {
            return getNodesWithFreeSpace(fractionalNodes, freeSpace);
        } else {
            return getNodesWithFreeSpace(fullNodes, freeSpace);
        }
    }

    /**
     * @dev addNode - adds Node to array
     * function could be run only by executor
     * @param from - owner of Node
     * @param name - Node name
     * @param ip - Node ip
     * @param publicIP - Node public ip
     * @param port - Node public port
     * @param publicKey - Ethereum public key
     * @return index of Node
     */
    function addNode(
        address from,
        string calldata name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        bytes calldata publicKey)
    external allow("NodesFunctionality") returns (uint)
    {
        nodes.push(Node({
            name: name,
            ip: ip,
            publicIP: publicIP,
            port: port,
            //owner: from,
            publicKey: publicKey,
            startDate: uint32(block.timestamp),
            leavingDate: uint32(0),
            lastRewardDate: uint32(block.timestamp),
            status: NodeStatus.Active
        }));
        bytes32 nodeId = keccak256(abi.encodePacked(name));
        nodesIPCheck[ip] = true;
        nodesNameCheck[nodeId] = true;
        nodesNameToIndex[nodeId] = nodes.length - 1;
        nodeIndexes[from].isNodeExist[nodes.length - 1] = true;
        nodeIndexes[from].numberOfNodes++;
        numberOfActiveNodes++;
        return nodes.length - 1;
    }

    /**
     * @dev addFractionalNode - adds Node to array of Fractional Nodes
     * function could be run only by executor
     * @param nodeIndex - index of Node
     */
    function addFractionalNode(uint nodeIndex) external allow("NodesFunctionality") {
        fractionalNodes.push(NodeFilling({
            nodeIndex: nodeIndex,
            freeSpace: 128
        }));
        nodesLink.push(NodeLink({
            subarrayLink: fractionalNodes.length - 1,
            isNodeFull: false
        }));
    }

    /**
     * @dev addFullNode - adds Node to array of Full Nodes
     * function could be run only by executor
     * @param nodeIndex - index of Node
     */
    function addFullNode(uint nodeIndex) external allow("NodesFunctionality") {
        fullNodes.push(NodeFilling({
            nodeIndex: nodeIndex,
            freeSpace: 128
        }));
        nodesLink.push(NodeLink({
            subarrayLink: fullNodes.length - 1,
            isNodeFull: true
        }));
    }

    /**
     * @dev setNodeLeaving - set Node Leaving
     * function could be run only by NodesFunctionality
     * @param nodeIndex - index of Node
     */
    function setNodeLeaving(uint nodeIndex) external allow("NodesFunctionality") {
        nodes[nodeIndex].status = NodeStatus.Leaving;
        nodes[nodeIndex].leavingDate = uint32(block.timestamp);
        numberOfActiveNodes--;
        numberOfLeavingNodes++;
    }

    /**
     * @dev setNodeLeft - set Node Left
     * function could be run only by NodesFunctionality
     * @param nodeIndex - index of Node
     */
    function setNodeLeft(uint nodeIndex) external allow("NodesFunctionality") {
        nodesIPCheck[nodes[nodeIndex].ip] = false;
        nodesNameCheck[keccak256(abi.encodePacked(nodes[nodeIndex].name))] = false;
        // address ownerOfNode = nodes[nodeIndex].owner;
        // nodeIndexes[ownerOfNode].isNodeExist[nodeIndex] = false;
        // nodeIndexes[ownerOfNode].numberOfNodes--;
        delete nodesNameToIndex[keccak256(abi.encodePacked(nodes[nodeIndex].name))];
        if (nodes[nodeIndex].status == NodeStatus.Active) {
            numberOfActiveNodes--;
        } else {
            numberOfLeavingNodes--;
        }
        nodes[nodeIndex].status = NodeStatus.Left;
        numberOfLeftNodes++;
    }

    /**
     * @dev removeFractionalNode - removes Node from Fractional Nodes array
     * function could be run only by NodesFunctionality
     * @param subarrayIndex - index of Node at array of Fractional Nodes
     */
    function removeFractionalNode(uint subarrayIndex) external allow("NodesFunctionality") {
        if (subarrayIndex != fractionalNodes.length - 1) {
            uint secondNodeIndex = fractionalNodes[fractionalNodes.length - 1].nodeIndex;
            fractionalNodes[subarrayIndex] = fractionalNodes[fractionalNodes.length - 1];
            nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
        }
        delete fractionalNodes[fractionalNodes.length - 1];
        fractionalNodes.length--;
    }

    /**
     * @dev removeFullNode - removes Node from Full Nodes array
     * function could be run only by NodesFunctionality
     * @param subarrayIndex - index of Node at array of Full Nodes
     */
    function removeFullNode(uint subarrayIndex) external allow("NodesFunctionality") {
        if (subarrayIndex != fullNodes.length - 1) {
            uint secondNodeIndex = fullNodes[fullNodes.length - 1].nodeIndex;
            fullNodes[subarrayIndex] = fullNodes[fullNodes.length - 1];
            nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
        }
        delete fullNodes[fullNodes.length - 1];
        fullNodes.length--;
    }

    /**
     * @dev removeSpaceFromFractionalNode - occupies space from Fractional Node
     * function could be run only by SchainsFunctionality
     * @param subarrayLink - index of Node at array of Fractional Nodes
     * @param space - space which should be occupied
     */
    function removeSpaceFromFractionalNode(uint subarrayLink, uint space) external allow("SchainsFunctionalityInternal") returns (bool) {
        if (fractionalNodes[subarrayLink].freeSpace < space) {
            return false;
        }
        fractionalNodes[subarrayLink].freeSpace -= space;
        return true;
    }

    /**
     * @dev removeSpaceFromFullNodes - occupies space from Full Node
     * function could be run only by SchainsFunctionality
     * @param subarrayLink - index of Node at array of Full Nodes
     * @param space - space which should be occupied
     */
    function removeSpaceFromFullNode(uint subarrayLink, uint space) external allow("SchainsFunctionalityInternal") returns (bool) {
        if (fullNodes[subarrayLink].freeSpace < space) {
            return false;
        }
        fullNodes[subarrayLink].freeSpace -= space;
        return true;
    }

    /**
     * @dev adSpaceToFractionalNode - returns space to Fractional Node
     * function could be run only be SchainsFunctionality
     * @param subarrayLink - index of Node at array of Fractional Nodes
     * @param space - space which should be returned
     */
    function addSpaceToFractionalNode(uint subarrayLink, uint space) external allow("SchainsFunctionality") {
        fractionalNodes[subarrayLink].freeSpace += space;
    }

    /**
     * @dev addSpaceToFullNode - returns space to Full Node
     * function could be run only by SchainsFunctionality
     * @param subarrayLink - index of Node at array of Full Nodes
     * @param space - space which should be returned
     */
    function addSpaceToFullNode(uint subarrayLink, uint space) external allow("SchainsFunctionality") {
        fullNodes[subarrayLink].freeSpace += space;
    }

    /**
     * @dev changeNodeLastRewardDate - changes Node's last reward date
     * function could be run only by SkaleManager
     * @param nodeIndex - index of Node
     */
    function changeNodeLastRewardDate(uint nodeIndex) external allow("SkaleManager") {
        nodes[nodeIndex].lastRewardDate = uint32(block.timestamp);
    }

    /**
     * @dev isNodeExist - checks existence of Node at this address
     * @param from - account address
     * @param nodeIndex - index of Node
     * @return if exist - true, else - false
     */
    function isNodeExist(address from, uint nodeIndex) external view returns (bool) {
        return nodeIndexes[from].isNodeExist[nodeIndex];
    }

    /**
     * @dev isLeavingPeriodExpired - checks expiration of leaving period of Node
     * @param nodeIndex - index of Node
     * @return if expired - true, else - false
     */
    function isLeavingPeriodExpired(uint nodeIndex) external view returns (bool) {
        return block.timestamp - nodes[nodeIndex].leavingDate >= leavingPeriod;
    }

    /**
     * @dev isTimeForReward - checks if time for reward has come
     * @param nodeIndex - index of Node
     * @return if time for reward has come - true, else - false
     */
    function isTimeForReward(uint nodeIndex) external view returns (bool) {
        address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
        return nodes[nodeIndex].lastRewardDate + IConstants(constantsAddress).rewardPeriod() <= block.timestamp;
    }

    /**
     * @dev getNodeIP - get ip address of Node
     * @param nodeIndex - index of Node
     * @return ip address
     */
    function getNodeIP(uint nodeIndex) external view returns (bytes4) {
        return nodes[nodeIndex].ip;
    }

    /**
     * @dev getNodePort - get Node's port
     * @param nodeIndex - index of Node
     * @return port
     */
    function getNodePort(uint nodeIndex) external view returns (uint16) {
        return nodes[nodeIndex].port;
    }

    /**
     * @dev isNodeLeaving - checks if Node status Leaving
     * @param nodeIndex - index of Node
     * @return if Node status Leaving - true, else - false
     */
    function isNodeLeaving(uint nodeIndex) external view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Leaving;
    }

    /**
     * @dev isNodeLeft - checks if Node status Left
     * @param nodeIndex - index of Node
     * @return if Node status Left - true, else - false
     */
    function isNodeLeft(uint nodeIndex) external view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Left;
    }

    /**
     * @dev getNodeLastRewardDate - get Node last reward date
     * @param nodeIndex - index of Node
     * @return Node last reward date
     */
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32) {
        return nodes[nodeIndex].lastRewardDate;
    }

    /**
     * @dev getNodeNextRewardDate - get Node next reward date
     * @param nodeIndex - index of Node
     * @return Node next reward date
     */
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint32) {
        address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
        return nodes[nodeIndex].lastRewardDate + IConstants(constantsAddress).rewardPeriod();
    }

    /**
     * @dev getNumberOfNodes - get number of Nodes
     * @return number of Nodes
     */
    function getNumberOfNodes() external view returns (uint) {
        return nodes.length;
    }

    /**
     * @dev getNumberOfFractionalNodes - get number of Fractional Nodes
     * @return number of Fractional Nodes
     */
    function getNumberOfFractionalNodes() external view returns (uint) {
        return fractionalNodes.length;
    }

    /**
     * @dev getNumberOfFullNodes - get number of Full Nodes
     * @return number of Full Nodes
     */
    function getNumberOfFullNodes() external view returns (uint) {
        return fullNodes.length;
    }

    /**
     * @dev getNumberOfFullNodes - get number Online Nodes
     * @return number of active nodes plus number of leaving nodes
     */
    function getNumberOnlineNodes() external view returns (uint) {
        return numberOfActiveNodes + numberOfLeavingNodes;
    }

    /**
     * @dev getNumberOfFreefractionalNodes - get number of free Fractional Nodes
     * @return numberOfFreeFractionalNodes - number of free Fractional Nodes
     */
    function getNumberOfFreeFractionalNodes(uint space, uint needNodes) external view returns (bool nodesAreEnough) {
        uint numberOfFreeFractionalNodes = 0;
        for (uint indexOfNode = 0; indexOfNode < fractionalNodes.length; indexOfNode++) {
            if (fractionalNodes[indexOfNode].freeSpace >= space && isNodeActive(fractionalNodes[indexOfNode].nodeIndex)) {
                numberOfFreeFractionalNodes++;
                if (numberOfFreeFractionalNodes == needNodes) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @dev getnumberOfFreeFullNodes - get number of free Full Nodes
     * @return numberOfFreeFullNodes - number of free Full Nodes
     */
    function getNumberOfFreeFullNodes(uint needNodes) external view returns (bool nodesAreEnough) {
        uint numberOfFreeFullNodes = 0;
        for (uint indexOfNode = 0; indexOfNode < fullNodes.length; indexOfNode++) {
            if (fullNodes[indexOfNode].freeSpace == 128 && isNodeActive(fullNodes[indexOfNode].nodeIndex)) {
                numberOfFreeFullNodes++;
                if (numberOfFreeFullNodes == needNodes) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @dev getActiveNodeIPs - get array of ips of Active Nodes
     * @return activeNodeIPs - array of ips of Active Nodes
     */
    function getActiveNodeIPs() external view returns (bytes4[] memory activeNodeIPs) {
        activeNodeIPs = new bytes4[](numberOfActiveNodes);
        uint indexOfActiveNodeIPs = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (isNodeActive(indexOfNodes)) {
                activeNodeIPs[indexOfActiveNodeIPs] = nodes[indexOfNodes].ip;
                indexOfActiveNodeIPs++;
            }
        }
    }

    /**
     * @dev getActiveNodesByAddress - get array of indexes of Active Nodes, which were
     * created by msg.sender
     * @return activeNodesbyAddress - array of indexes of Active Nodes, which were created
     * by msg.sender
     */
    function getActiveNodesByAddress() external view returns (uint[] memory activeNodesByAddress) {
        activeNodesByAddress = new uint[](nodeIndexes[msg.sender].numberOfNodes);
        uint indexOfActiveNodesByAddress = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (nodeIndexes[msg.sender].isNodeExist[indexOfNodes] && isNodeActive(indexOfNodes)) {
                activeNodesByAddress[indexOfActiveNodesByAddress] = indexOfNodes;
                indexOfActiveNodesByAddress++;
            }
        }
    }

    function getActiveFractionalNodes() external view returns (uint[] memory) {
        uint[] memory activeFractionalNodes = new uint[](fractionalNodes.length);
        for (uint index = 0; index < fractionalNodes.length; index++) {
            activeFractionalNodes[index] = fractionalNodes[index].nodeIndex;
        }
        return activeFractionalNodes;
    }

    function getActiveFullNodes() external view returns (uint[] memory) {
        uint[] memory activeFullNodes = new uint[](fullNodes.length);
        for (uint index = 0; index < fullNodes.length; index++) {
            activeFullNodes[index] = fullNodes[index].nodeIndex;
        }
        return activeFullNodes;
    }

    function enableValidator(address validator) public {
        trustedValidators[validator] = true;
    }

    function disableValidator(address validator) public {
        trustedValidators[validator] = false;
    }
    
    /**
     * @dev isNodeActive - checks if Node status Active
     * @param nodeIndex - index of Node
     * @return if Node status Active - true, else - false
     */
    function isNodeActive(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Active;
    }

    /**
     * @dev getActiveNodeIds - get array of indexes of Active Nodes
     * @return activeNodeIds - array of indexes of Active Nodes
     */
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

    function getNodesWithFreeSpace(NodeFilling[] storage nodesFillings, uint freeSpace) internal view returns (uint[] memory) {
        uint[] memory nodesWithFreeSpace = new uint[](countNodesWithFreeSpace(nodesFillings, freeSpace));
        uint cursor = 0;
        for (uint i = 0; i < nodesFillings.length; ++i) {
            if (nodesFillings[i].freeSpace >= freeSpace) {
                nodesWithFreeSpace[cursor] = nodesFillings[i].nodeIndex;
                ++cursor;
            }
        }
        return nodesWithFreeSpace;
    }

    function countNodesWithFreeSpace(NodeFilling[] storage nodesFillings, uint freeSpace) internal view returns (uint count) {
        count = 0;
        for (uint i = 0; i < nodesFillings.length; ++i) {
            if (nodesFillings[i].freeSpace >= freeSpace) {
                ++count;
            }
        }
    }

}
