pragma solidity 0.6.6;

interface INodesFunctionality {
    function createNode(address from, bytes calldata data) external returns (uint);
    function initExit(address from, uint nodeIndex) external returns (bool);
    function completeExit(address from, uint nodeIndex) external returns (bool);
    function removeNode(address from, uint nodeIndex) external;
    function removeNodeByRoot(uint nodeIndex) external;
}