pragma solidity ^0.4.24;

import "./GroupsData.sol";


contract SchainsData is GroupsData {

    struct Schain {
        string name;
        address owner;
        uint indexInOwnerList;
        uint partOfNode;
        uint lifetime;
        uint32 startDate;
        uint deposit;
        uint64 index;
    }

    mapping (bytes32 => Schain) public schains;
    mapping (address => bytes32[]) public schainIndexes;
    mapping (uint => bytes32[]) public schainsForNodes;
    bytes32[] private schainsAtSystem;

    uint64 public numberOfSchains = 0;
    uint public sumOfSchainsResources = 0;

    constructor(string newExecutorName, address newContractsAddress) GroupsData(newExecutorName, newContractsAddress) public {
    
    }

    function initializeSchain(string name, address from, uint lifetime, uint deposit) public allow(executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        schains[schainId].name = name;
        schains[schainId].owner = from;
        schains[schainId].startDate = uint32(block.timestamp);
        schains[schainId].lifetime = lifetime;
        schains[schainId].deposit = deposit;
        schains[schainId].index = numberOfSchains;
        numberOfSchains++;
        schainsAtSystem.push(schainId);
    }
    
    function setSchainIndex(bytes32 schainId, address from) public allow(executorName) {
        schains[schainId].indexInOwnerList = schainIndexes[from].length;
        schainIndexes[from].push(schainId);
    }

    function addSchainForNode(uint nodeIndex, bytes32 schainId) public allow(executorName) {
        schainsForNodes[nodeIndex].push(schainId);
    }

    function setSchainPartOfNode(bytes32 schainId, uint partOfNode) public allow(executorName) {
        schains[schainId].partOfNode = partOfNode;
        if (partOfNode > 0) {
            sumOfSchainsResources += (128 / partOfNode) * groups[schainId].nodesInGroup.length;
        }
    }

    function changeLifetime(bytes32 schainId, uint lifetime, uint deposit) public allow(executorName) {
        schains[schainId].deposit += deposit;
        schains[schainId].lifetime += lifetime;
    }

    function removeSchain(bytes32 schainId, address from) public allow(executorName) {
        uint length = schainIndexes[from].length;
        uint index = schains[schainId].indexInOwnerList;
        if (index != length - 1) {
            bytes32 lastSchainId = schainIndexes[from][length - 1];
            schains[lastSchainId].indexInOwnerList = index;
            schainIndexes[from][index] = lastSchainId;
        }
        delete schainIndexes[from][length - 1];
        schainIndexes[from].length--;
        delete schains[schainId];
    }

    function removeSchainForNode(uint nodeIndex, uint schainIndex) public allow(executorName) {
        uint length = schainsForNodes[nodeIndex].length;
        if (schainIndex != length - 1) {
            schainsForNodes[nodeIndex][schainIndex] = schainsForNodes[nodeIndex][length - 1];
        }
        delete schainsForNodes[nodeIndex][length - 1];
        schainsForNodes[nodeIndex].length--;
    }

    function getSchains() public view returns (bytes32[] memory) {
        return schainsAtSystem;
    }

    function getSchainsPartOfNode(bytes32 schainId) public view returns (uint) {
        return schains[schainId].partOfNode;
    }

    function getSchainListSize(address from) public view returns (uint) {
        return schainIndexes[from].length;
    }

    function getSchainIdsByAddress(address from) public view returns (bytes32[]) {
        return schainIndexes[from];
    }

    function getSchainIdsForNode(uint nodeIndex) public view returns (bytes32[]) {
        return schainsForNodes[nodeIndex];
    }

    function getLengthOfSchainsForNode(uint nodeIndex) public view returns (uint) {
        return schainsForNodes[nodeIndex].length;
    }

    function getSchainIdFromSchainName(string schainName) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(schainName));
    }

    function isSchainNameAvailable(string name) public view returns (bool) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        return schains[schainId].owner == address(0);
    }

    function isTimeExpired(bytes32 schainId) public view returns (bool) {
        return schains[schainId].startDate + schains[schainId].lifetime < block.timestamp;
    }

    function isOwnerAddress(address from, bytes32 schainId) public view returns (bool) {
        return schains[schainId].owner == from;
    }
}
