pragma solidity ^0.5.0;

/**
 * @title NodesData - interface of NodesData contract
 * Contains only needed functions for current contract
 */
interface INodesData {
    function nodesIPCheck(bytes4 ip) external view returns (bool);
    function nodesNameCheck(bytes32 name) external view returns (bool);
    function nodesLink(uint nodeIndex) external view returns (uint, bool);
    function getNumberOfFractionalNodes() external view returns (uint);
    function getNumberOfFullNodes() external view returns (uint);
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function isNodeLeaving(uint nodeIndex) external view returns (bool);
    function isLeavingPeriodExpired(uint nodeIndex) external view returns (bool);
    function isTimeForReward(uint nodeIndex) external view returns (bool);
    function addNode(
        address from,
        string calldata name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        bytes calldata publicKey)
    external returns (uint);
    function addFractionalNode(uint nodeIndex) external;
    function addFullNode(uint nodeIndex) external;
    function setNodeLeaving(uint nodeIndex) external;
    function setNodeLeft(uint nodeIndex) external;
    function removeFractionalNode(uint subarrayLink) external;
    function removeFullNode(uint subarrayLink) external;
    function numberOfActiveNodes() external view returns (uint);
    function numberOfLeavingNodes() external view returns (uint);
    function changeNodeLastRewardDate(uint nodeIndex) external;
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32);
    function addSpaceToFullNode(uint subarrayLink, uint space) external;
    function addSpaceToFractionalNode(uint subarrayLink, uint space) external;
    function fullNodes(uint indexOfNode) external view returns (uint, uint);
    function fractionalNodes(uint indexOfNode) external view returns (uint, uint);
    function removeSpaceFromFullNode(uint subarrayLink, uint space) external returns (bool);
    function removeSpaceFromFractionalNode(uint subarrayLink, uint space) external returns (bool);
    function getNumberOfFreeFullNodes() external view returns (uint);
    function getNumberOfFreeFractionalNodes(uint space) external view returns (uint);
    function getNumberOfNodes() external view returns (uint);
    function getNodeIP(uint nodeIndex) external view returns (bytes4);
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint32);
    function getActiveNodeIds() external view returns (uint[] memory activeNodeIds);
}