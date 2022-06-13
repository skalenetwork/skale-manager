// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISchainsInternal - SKALE Manager Interfaces
    Copyright (C) 2021-Present SKALE Labs
    @author Dmytro Stebaiev

    SKALE Manager Interfaces is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager Interfaces is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager Interfaces.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.6.10 <0.9.0;

import "./INodes.sol";

interface ISchainsInternal {
    struct Schain {
        string name;
        address owner;
        uint indexInOwnerList;
        uint8 partOfNode;
        uint lifetime;
        uint startDate;
        uint startBlock;
        uint deposit;
        uint64 index;
        uint generation;
        address originator;
    }

    struct SchainType {
        uint8 partOfNode;
        uint numberOfNodes;
    }

    /**
     * @dev Emitted when schain type added.
     */
    event SchainTypeAdded(uint indexed schainType, uint partOfNode, uint numberOfNodes);

    /**
     * @dev Emitted when schain type removed.
     */
    event SchainTypeRemoved(uint indexed schainType);

    function initializeSchain(
        string calldata name,
        address from,
        address originator,
        uint lifetime,
        uint deposit) external;
    function createGroupForSchain(
        bytes32 schainHash,
        uint numberOfNodes,
        uint8 partOfNode
    )
        external
        returns (uint[] memory);
    function changeLifetime(bytes32 schainHash, uint lifetime, uint deposit) external;
    function removeSchain(bytes32 schainHash, address from) external;
    function removeNodeFromSchain(uint nodeIndex, bytes32 schainHash) external;
    function deleteGroup(bytes32 schainHash) external;
    function setException(bytes32 schainHash, uint nodeIndex) external;
    function setNodeInGroup(bytes32 schainHash, uint nodeIndex) external;
    function removeHolesForSchain(bytes32 schainHash) external;
    function addSchainType(uint8 partOfNode, uint numberOfNodes) external;
    function removeSchainType(uint typeOfSchain) external;
    function setNumberOfSchainTypes(uint newNumberOfSchainTypes) external;
    function removeNodeFromAllExceptionSchains(uint nodeIndex) external;
    function removeAllNodesFromSchainExceptions(bytes32 schainHash) external;
    function makeSchainNodesInvisible(bytes32 schainHash) external;
    function makeSchainNodesVisible(bytes32 schainHash) external;
    function newGeneration() external;
    function addSchainForNode(INodes nodes, uint nodeIndex, bytes32 schainHash) external;
    function removeSchainForNode(uint nodeIndex, uint schainIndex) external;
    function removeNodeFromExceptions(bytes32 schainHash, uint nodeIndex) external;
    function isSchainActive(bytes32 schainHash) external view returns (bool);
    function schainsAtSystem(uint index) external view returns (bytes32);
    function numberOfSchains() external view returns (uint64);
    function getSchains() external view returns (bytes32[] memory);
    function getSchainsPartOfNode(bytes32 schainHash) external view returns (uint8);
    function getSchainListSize(address from) external view returns (uint);
    function getSchainHashesByAddress(address from) external view returns (bytes32[] memory);
    function getSchainIdsByAddress(address from) external view returns (bytes32[] memory);
    function getSchainHashesForNode(uint nodeIndex) external view returns (bytes32[] memory);
    function getSchainIdsForNode(uint nodeIndex) external view returns (bytes32[] memory);
    function getSchainOwner(bytes32 schainHash) external view returns (address);
    function getSchainOriginator(bytes32 schainHash) external view returns (address);
    function isSchainNameAvailable(string calldata name) external view returns (bool);
    function isTimeExpired(bytes32 schainHash) external view returns (bool);
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool);
    function getSchainName(bytes32 schainHash) external view returns (string memory);
    function getActiveSchain(uint nodeIndex) external view returns (bytes32);
    function getActiveSchains(uint nodeIndex) external view returns (bytes32[] memory activeSchains);
    function getNumberOfNodesInGroup(bytes32 schainHash) external view returns (uint);
    function getNodesInGroup(bytes32 schainHash) external view returns (uint[] memory);
    function isNodeAddressesInGroup(bytes32 schainId, address sender) external view returns (bool);
    function getNodeIndexInGroup(bytes32 schainHash, uint nodeId) external view returns (uint);
    function isAnyFreeNode(bytes32 schainHash) external view returns (bool);
    function checkException(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function checkHoleForSchain(bytes32 schainHash, uint indexOfNode) external view returns (bool);
    function checkSchainOnNode(uint nodeIndex, bytes32 schainHash) external view returns (bool);
    function getSchainType(uint typeOfSchain) external view returns(uint8, uint);
    function getGeneration(bytes32 schainHash) external view returns (uint);
    function isSchainExist(bytes32 schainHash) external view returns (bool);
}