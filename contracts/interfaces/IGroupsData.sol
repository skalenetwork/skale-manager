pragma solidity 0.6.6;

/**
 * @title GroupsData - interface of GroupsData
 */
interface IGroupsData {
    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) external;
    function removeAllNodesInGroup(bytes32 groupIndex) external;
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) external;
    function removeGroup(bytes32 groupIndex) external;
    function setException(bytes32 groupIndex, uint nodeIndex) external;
    function setGroupFailedDKG(bytes32 groupIndex) external;
    function isGroupActive(bytes32 groupIndex) external view returns (bool);
    function getNodesInGroup(bytes32 schainId) external view returns (uint[] memory);
    function getGroupData(bytes32 groupIndex) external view returns (bytes32);
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view returns (uint);
}