pragma solidity ^0.5.0;

interface ISchainsFunctionality {
    function addSchain(address from, uint value, bytes calldata data) external;
    function deleteSchain(address from, bytes32 schainId) external;
    function deleteSchainByRoot(bytes32 schainId) external;
}