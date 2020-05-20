pragma solidity 0.6.6;

interface ISchainsFunctionalityInternal {
    function createGroupForSchain(
        string calldata schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint8 partOfNode) external;
    function deleteGroup(bytes32 groupIndex) external;
    function selectNodeToGroup(bytes32 groupIndex) external;
    function removeNodeFromSchain(uint nodeIndex, bytes32 groupHash) external;
    function removeNodeFromExceptions(bytes32 groupHash, uint nodeIndex) external;
    function excludeNodeFromSchain(uint nodeIndex, bytes32 groupHash) external;
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) external view returns (uint, uint8);
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) external view returns (uint);
    function isEnoughNodes(bytes32 groupIndex) external view returns (uint[] memory);
}