// SPDX-License-Identifier: AGPL-3.0-only

/*
    SchainsInternal.sol - SKALE Manager
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

pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

import "./interfaces/ISkaleDKG.sol";
import "./utils/Random.sol";

import "./ConstantsHolder.sol";
import "./Nodes.sol";

import "openzeppelin-solidity/contracts/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title SchainsInternal
 * @dev Contract contains all functionality logic to internally manage Schains.
 */
contract SchainsInternal is Permissions {

    using Random for Random.RandomGenerator;
    using SafeMath for uint;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

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
    }

    struct SchainType {
        uint8 partOfNode;
        uint numberOfNodes;
    }


    // mapping which contain all schains
    mapping (bytes32 => Schain) public schains;

    mapping (bytes32 => bool) public isSchainActive;

    mapping (bytes32 => uint[]) public schainsGroups;

    mapping (bytes32 => mapping (uint => bool)) private _exceptionsForGroups;
    // mapping shows schains by owner's address
    mapping (address => bytes32[]) public schainIndexes;
    // mapping shows schains which Node composed in
    mapping (uint => bytes32[]) public schainsForNodes;

    mapping (uint => uint[]) public holesForNodes;

    mapping (bytes32 => uint[]) public holesForSchains;

    // array which contain all schains
    bytes32[] public schainsAtSystem;

    uint64 public numberOfSchains;
    // total resources that schains occupied
    uint public sumOfSchainsResources;

    mapping (bytes32 => bool) public usedSchainNames;

    mapping (uint => SchainType) public schainTypes;
    uint public numberOfSchainTypes;

    //   schain hash =>   node index  => index of place
    // index of place is a number from 1 to max number of slots on node(128)
    mapping (bytes32 => mapping (uint => uint)) public placeOfSchainOnNode;

    mapping (uint => bytes32[]) private _nodeToLockedSchains;

    mapping (bytes32 => uint[]) private _schainToExceptionNodes;

    EnumerableSetUpgradeable.UintSet private _keysOfSchainTypes;

    /**
     * @dev Allows Schain contract to initialize an schain.
     */
    function initializeSchain(
        string calldata name,
        address from,
        uint lifetime,
        uint deposit) external allow("Schains")
    {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        schains[schainId].name = name;
        schains[schainId].owner = from;
        schains[schainId].startDate = block.timestamp;
        schains[schainId].startBlock = block.number;
        schains[schainId].lifetime = lifetime;
        schains[schainId].deposit = deposit;
        schains[schainId].index = numberOfSchains;
        isSchainActive[schainId] = true;
        numberOfSchains++;
        schainsAtSystem.push(schainId);
        usedSchainNames[schainId] = true;
    }

    /**
     * @dev Allows Schain contract to create a node group for an schain.
     */
    function createGroupForSchain(
        bytes32 schainId,
        uint numberOfNodes,
        uint8 partOfNode
    )
        external
        allow("Schains")
        returns (uint[] memory)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        schains[schainId].partOfNode = partOfNode;
        if (partOfNode > 0) {
            sumOfSchainsResources = sumOfSchainsResources.add(
                numberOfNodes.mul(constantsHolder.TOTAL_SPACE_ON_NODE()).div(partOfNode)
            );
        }
        return _generateGroup(schainId, numberOfNodes);
    }

    /**
     * @dev Allows Schains contract to set index in owner list.
     */
    function setSchainIndex(bytes32 schainId, address from) external allow("Schains") {
        schains[schainId].indexInOwnerList = schainIndexes[from].length;
        schainIndexes[from].push(schainId);
    }

    /**
     * @dev Allows Schains contract to change the Schain lifetime through
     * an additional SKL token deposit.
     */
    function changeLifetime(bytes32 schainId, uint lifetime, uint deposit) external allow("Schains") {
        schains[schainId].deposit = schains[schainId].deposit.add(deposit);
        schains[schainId].lifetime = schains[schainId].lifetime.add(lifetime);
    }

    /**
     * @dev Allows Schains contract to remove an schain from the network.
     * Generally schains are not removed from the system; instead they are
     * simply allowed to expire.
     */
    function removeSchain(bytes32 schainId, address from) external allow("Schains") {
        isSchainActive[schainId] = false;
        uint length = schainIndexes[from].length;
        uint index = schains[schainId].indexInOwnerList;
        if (index != length.sub(1)) {
            bytes32 lastSchainId = schainIndexes[from][length.sub(1)];
            schains[lastSchainId].indexInOwnerList = index;
            schainIndexes[from][index] = lastSchainId;
        }
        schainIndexes[from].pop();

        // TODO:
        // optimize
        for (uint i = 0; i + 1 < schainsAtSystem.length; i++) {
            if (schainsAtSystem[i] == schainId) {
                schainsAtSystem[i] = schainsAtSystem[schainsAtSystem.length.sub(1)];
                break;
            }
        }
        schainsAtSystem.pop();

        delete schains[schainId];
        numberOfSchains--;
    }

    /**
     * @dev Allows Schains and SkaleDKG contracts to remove a node from an
     * schain for node rotation or DKG failure.
     */
    function removeNodeFromSchain(
        uint nodeIndex,
        bytes32 schainHash
    )
        external
        allowThree("NodeRotation", "SkaleDKG", "Schains")
    {
        uint indexOfNode = _findNode(schainHash, nodeIndex);
        uint indexOfLastNode = schainsGroups[schainHash].length.sub(1);

        if (indexOfNode == indexOfLastNode) {
            schainsGroups[schainHash].pop();
        } else {
            delete schainsGroups[schainHash][indexOfNode];
            if (holesForSchains[schainHash].length > 0 && holesForSchains[schainHash][0] > indexOfNode) {
                uint hole = holesForSchains[schainHash][0];
                holesForSchains[schainHash][0] = indexOfNode;
                holesForSchains[schainHash].push(hole);
            } else {
                holesForSchains[schainHash].push(indexOfNode);
            }
        }

        uint schainIndexOnNode = findSchainAtSchainsForNode(nodeIndex, schainHash);
        removeSchainForNode(nodeIndex, schainIndexOnNode);
        delete placeOfSchainOnNode[schainHash][nodeIndex];
    }

    /**
     * @dev Allows Schains contract to delete a group of schains
     */
    function deleteGroup(bytes32 schainId) external allow("Schains") {
        // delete channel
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        delete schainsGroups[schainId];
        skaleDKG.deleteChannel(schainId);
    }

    /**
     * @dev Allows Schain and NodeRotation contracts to set a Node like
     * exception for a given schain and nodeIndex.
     */
    function setException(bytes32 schainId, uint nodeIndex) external allowTwo("Schains", "NodeRotation") {
        _setException(schainId, nodeIndex);
    }

    /**
     * @dev Allows Schains and NodeRotation contracts to add node to an schain
     * group.
     */
    function setNodeInGroup(bytes32 schainId, uint nodeIndex) external allowTwo("Schains", "NodeRotation") {
        if (holesForSchains[schainId].length == 0) {
            schainsGroups[schainId].push(nodeIndex);
        } else {
            schainsGroups[schainId][holesForSchains[schainId][0]] = nodeIndex;
            uint min = type(uint).max;
            uint index = 0;
            for (uint i = 1; i < holesForSchains[schainId].length; i++) {
                if (min > holesForSchains[schainId][i]) {
                    min = holesForSchains[schainId][i];
                    index = i;
                }
            }
            if (min == type(uint).max) {
                delete holesForSchains[schainId];
            } else {
                holesForSchains[schainId][0] = min;
                holesForSchains[schainId][index] =
                    holesForSchains[schainId][holesForSchains[schainId].length - 1];
                holesForSchains[schainId].pop();
            }
        }
    }

    /**
     * @dev Allows Schains contract to remove holes for schains
     */
    function removeHolesForSchain(bytes32 schainHash) external allow("Schains") {
        delete holesForSchains[schainHash];
    }

    /**
     * @dev Allows Admin to add schain type
     */
    function addSchainType(uint8 partOfNode, uint numberOfNodes) external onlyAdmin {
        require(_keysOfSchainTypes.add(numberOfSchainTypes + 1), "Schain type is already added");
        schainTypes[numberOfSchainTypes + 1].partOfNode = partOfNode;
        schainTypes[numberOfSchainTypes + 1].numberOfNodes = numberOfNodes;
        numberOfSchainTypes++;
    }

    /**
     * @dev Allows Admin to remove schain type
     */
    function removeSchainType(uint typeOfSchain) external onlyAdmin {
        require(_keysOfSchainTypes.remove(typeOfSchain), "Schain type is already removed");
        delete schainTypes[typeOfSchain].partOfNode;
        delete schainTypes[typeOfSchain].numberOfNodes;
    }

    /**
     * @dev Allows Admin to set number of schain types
     */
    function setNumberOfSchainTypes(uint newNumberOfSchainTypes) external onlyAdmin {
        numberOfSchainTypes = newNumberOfSchainTypes;
    }

    /**
     * @dev Allows Admin to move schain to placeOfSchainOnNode map
     */
    function moveToPlaceOfSchainOnNode(bytes32 schainHash) external onlyAdmin {
        for (uint i = 0; i < schainsGroups[schainHash].length; i++) {
            uint nodeIndex = schainsGroups[schainHash][i];
            for (uint j = 0; j < schainsForNodes[nodeIndex].length; j++) {
                if (schainsForNodes[nodeIndex][j] == schainHash) {
                    placeOfSchainOnNode[schainHash][nodeIndex] = j + 1;
                }
            }
        }
    }

    function removeNodeFromAllExceptionSchains(uint nodeIndex) external allow("SkaleManager") {
        uint len = _nodeToLockedSchains[nodeIndex].length;
        if (len > 0) {
            for (uint i = len; i > 0; i--) {
                removeNodeFromExceptions(_nodeToLockedSchains[nodeIndex][i - 1], nodeIndex);
            }
        }
    }

    function makeSchainNodesInvisible(bytes32 schainId) external allowTwo("NodeRotation", "SkaleDKG") {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < _schainToExceptionNodes[schainId].length; i++) {
            nodes.makeNodeInvisible(_schainToExceptionNodes[schainId][i]);
        }
    }

    function makeSchainNodesVisible(bytes32 schainId) external allowTwo("NodeRotation", "SkaleDKG") {
        _makeSchainNodesVisible(schainId);
    }

    /**
     * @dev Returns all Schains in the network.
     */
    function getSchains() external view returns (bytes32[] memory) {
        return schainsAtSystem;
    }

    /**
     * @dev Returns all occupied resources on one node for an Schain.
     */
    function getSchainsPartOfNode(bytes32 schainId) external view returns (uint8) {
        return schains[schainId].partOfNode;
    }

    /**
     * @dev Returns number of schains by schain owner.
     */
    function getSchainListSize(address from) external view returns (uint) {
        return schainIndexes[from].length;
    }

    /**
     * @dev Returns hashes of schain names by schain owner.
     */
    function getSchainIdsByAddress(address from) external view returns (bytes32[] memory) {
        return schainIndexes[from];
    }

    /**
     * @dev Returns hashes of schain names running on a node.
     */
    function getSchainIdsForNode(uint nodeIndex) external view returns (bytes32[] memory) {
        return schainsForNodes[nodeIndex];
    }

    /**
     * @dev Returns the owner of an schain.
     */
    function getSchainOwner(bytes32 schainId) external view returns (address) {
        return schains[schainId].owner;
    }

    /**
     * @dev Checks whether schain name is available.
     * TODO Need to delete - copy of web3.utils.soliditySha3
     */
    function isSchainNameAvailable(string calldata name) external view returns (bool) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        return schains[schainId].owner == address(0) &&
            !usedSchainNames[schainId] &&
            keccak256(abi.encodePacked(name)) != keccak256(abi.encodePacked("Mainnet"));
    }

    /**
     * @dev Checks whether schain lifetime has expired.
     */
    function isTimeExpired(bytes32 schainId) external view returns (bool) {
        return uint(schains[schainId].startDate).add(schains[schainId].lifetime) < block.timestamp;
    }

    /**
     * @dev Checks whether address is owner of schain.
     */
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool) {
        return schains[schainId].owner == from;
    }

    /**
     * @dev Checks whether schain exists.
     */
    function isSchainExist(bytes32 schainId) external view returns (bool) {
        return keccak256(abi.encodePacked(schains[schainId].name)) != keccak256(abi.encodePacked(""));
    }

    /**
     * @dev Returns schain name.
     */
    function getSchainName(bytes32 schainId) external view returns (string memory) {
        return schains[schainId].name;
    }

    /**
     * @dev Returns last active schain of a node.
     */
    function getActiveSchain(uint nodeIndex) external view returns (bytes32) {
        for (uint i = schainsForNodes[nodeIndex].length; i > 0; i--) {
            if (schainsForNodes[nodeIndex][i - 1] != bytes32(0)) {
                return schainsForNodes[nodeIndex][i - 1];
            }
        }
        return bytes32(0);
    }

    /**
     * @dev Returns active schains of a node.
     */
    function getActiveSchains(uint nodeIndex) external view returns (bytes32[] memory activeSchains) {
        uint activeAmount = 0;
        for (uint i = 0; i < schainsForNodes[nodeIndex].length; i++) {
            if (schainsForNodes[nodeIndex][i] != bytes32(0)) {
                activeAmount++;
            }
        }

        uint cursor = 0;
        activeSchains = new bytes32[](activeAmount);
        for (uint i = schainsForNodes[nodeIndex].length; i > 0; i--) {
            if (schainsForNodes[nodeIndex][i - 1] != bytes32(0)) {
                activeSchains[cursor++] = schainsForNodes[nodeIndex][i - 1];
            }
        }
    }

    /**
     * @dev Returns number of nodes in an schain group.
     */
    function getNumberOfNodesInGroup(bytes32 schainId) external view returns (uint) {
        return schainsGroups[schainId].length;
    }

    /**
     * @dev Returns nodes in an schain group.
     */
    function getNodesInGroup(bytes32 schainId) external view returns (uint[] memory) {
        return schainsGroups[schainId];
    }

    /**
     * @dev Checks whether sender is a node address from a given schain group.
     */
    function isNodeAddressesInGroup(bytes32 schainId, address sender) external view returns (bool) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < schainsGroups[schainId].length; i++) {
            if (nodes.getNodeAddress(schainsGroups[schainId][i]) == sender) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Returns node index in schain group.
     */
    function getNodeIndexInGroup(bytes32 schainId, uint nodeId) external view returns (uint) {
        for (uint index = 0; index < schainsGroups[schainId].length; index++) {
            if (schainsGroups[schainId][index] == nodeId) {
                return index;
            }
        }
        return schainsGroups[schainId].length;
    }

    /**
     * @dev Checks whether there are any nodes with free resources for given
     * schain.
     */
    function isAnyFreeNode(bytes32 schainId) external view returns (bool) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        uint8 space = schains[schainId].partOfNode;
        return nodes.countNodesWithFreeSpace(space) > 0;
    }

    /**
     * @dev Returns whether any exceptions exist for node in a schain group.
     */
    function checkException(bytes32 schainId, uint nodeIndex) external view returns (bool) {
        return _exceptionsForGroups[schainId][nodeIndex];
    }

    function checkHoleForSchain(bytes32 schainHash, uint indexOfNode) external view returns (bool) {
        for (uint i = 0; i < holesForSchains[schainHash].length; i++) {
            if (holesForSchains[schainHash][i] == indexOfNode) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Returns number of Schains on a node.
     */
    function getLengthOfSchainsForNode(uint nodeIndex) external view returns (uint) {
        return schainsForNodes[nodeIndex].length;
    }

    function getSchainType(uint typeOfSchain) external view returns(uint8, uint) {
        require(_keysOfSchainTypes.contains(typeOfSchain), "Invalid type of schain");
        return (schainTypes[typeOfSchain].partOfNode, schainTypes[typeOfSchain].numberOfNodes);
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);

        numberOfSchains = 0;
        sumOfSchainsResources = 0;
        numberOfSchainTypes = 0;
    }

    /**
     * @dev Allows Schains and NodeRotation contracts to add schain to node.
     */
    function addSchainForNode(uint nodeIndex, bytes32 schainId) public allowTwo("Schains", "NodeRotation") {
        if (holesForNodes[nodeIndex].length == 0) {
            schainsForNodes[nodeIndex].push(schainId);
            placeOfSchainOnNode[schainId][nodeIndex] = schainsForNodes[nodeIndex].length;
        } else {
            uint lastHoleOfNode = holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
            schainsForNodes[nodeIndex][lastHoleOfNode] = schainId;
            placeOfSchainOnNode[schainId][nodeIndex] = lastHoleOfNode + 1;
            holesForNodes[nodeIndex].pop();
        }
    }

    /**
     * @dev Allows Schains, NodeRotation, and SkaleDKG contracts to remove an 
     * schain from a node.
     */
    function removeSchainForNode(uint nodeIndex, uint schainIndex)
        public
        allowThree("NodeRotation", "SkaleDKG", "Schains")
    {
        uint length = schainsForNodes[nodeIndex].length;
        if (schainIndex == length.sub(1)) {
            schainsForNodes[nodeIndex].pop();
        } else {
            delete schainsForNodes[nodeIndex][schainIndex];
            if (holesForNodes[nodeIndex].length > 0 && holesForNodes[nodeIndex][0] > schainIndex) {
                uint hole = holesForNodes[nodeIndex][0];
                holesForNodes[nodeIndex][0] = schainIndex;
                holesForNodes[nodeIndex].push(hole);
            } else {
                holesForNodes[nodeIndex].push(schainIndex);
            }
        }
    }

    /**
     * @dev Allows Schains contract to remove node from exceptions
     */
    function removeNodeFromExceptions(bytes32 schainHash, uint nodeIndex)
        public
        allowThree("Schains", "NodeRotation", "SkaleManager")
    {
        _exceptionsForGroups[schainHash][nodeIndex] = false;
        uint len = _nodeToLockedSchains[nodeIndex].length;
        bool removed = false;
        if (len > 0 && _nodeToLockedSchains[nodeIndex][len - 1] == schainHash) {
            _nodeToLockedSchains[nodeIndex].pop();
            removed = true;
        } else {
            for (uint i = len; i > 0 && !removed; i--) {
                if (_nodeToLockedSchains[nodeIndex][i - 1] == schainHash) {
                    _nodeToLockedSchains[nodeIndex][i - 1] = _nodeToLockedSchains[nodeIndex][len - 1];
                    _nodeToLockedSchains[nodeIndex].pop();
                    removed = true;
                }
            }
        }
        len = _schainToExceptionNodes[schainHash].length;
        removed = false;
        if (len > 0 && _schainToExceptionNodes[schainHash][len - 1] == nodeIndex) {
            _schainToExceptionNodes[schainHash].pop();
            removed = true;
        } else {
            for (uint i = len; i > 0 && !removed; i--) {
                if (_schainToExceptionNodes[schainHash][i - 1] == nodeIndex) {
                    _schainToExceptionNodes[schainHash][i - 1] = _schainToExceptionNodes[schainHash][len - 1];
                    _schainToExceptionNodes[schainHash].pop();
                    removed = true;
                }
            }
        }
    }

    /**
     * @dev Returns index of Schain in list of schains for a given node.
     */
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) public view returns (uint) {
        if (placeOfSchainOnNode[schainId][nodeIndex] == 0)
            return schainsForNodes[nodeIndex].length;
        return placeOfSchainOnNode[schainId][nodeIndex] - 1;
    }

    function _getNodeToLockedSchains() internal view returns (mapping(uint => bytes32[]) storage) {
        return _nodeToLockedSchains;
    }

    function _getSchainToExceptionNodes() internal view returns (mapping(bytes32 => uint[]) storage) {
        return _schainToExceptionNodes;
    }

    /**
     * @dev Generates schain group using a pseudo-random generator.
     */
    function _generateGroup(bytes32 schainId, uint numberOfNodes) private returns (uint[] memory nodesInGroup) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        uint8 space = schains[schainId].partOfNode;
        nodesInGroup = new uint[](numberOfNodes);

        require(nodes.countNodesWithFreeSpace(space) >= nodesInGroup.length, "Not enough nodes to create Schain");
        Random.RandomGenerator memory randomGenerator = Random.createFromEntropy(
            abi.encodePacked(uint(blockhash(block.number.sub(1))), schainId)
        );
        for (uint i = 0; i < numberOfNodes; i++) {
            uint node = nodes.getRandomNodeWithFreeSpace(space, randomGenerator);
            nodesInGroup[i] = node;
            _setException(schainId, node);
            addSchainForNode(node, schainId);
            nodes.makeNodeInvisible(node);
            require(nodes.removeSpaceFromNode(node, space), "Could not remove space from Node");
        }
        // set generated group
        schainsGroups[schainId] = nodesInGroup;
        _makeSchainNodesVisible(schainId);
    }

    function _setException(bytes32 schainId, uint nodeIndex) private {
        _exceptionsForGroups[schainId][nodeIndex] = true;
        _nodeToLockedSchains[nodeIndex].push(schainId);
        _schainToExceptionNodes[schainId].push(nodeIndex);
    }

    function _makeSchainNodesVisible(bytes32 schainId) private {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < _schainToExceptionNodes[schainId].length; i++) {
            nodes.makeNodeVisible(_schainToExceptionNodes[schainId][i]);
        }
    }

    /**
     * @dev Returns local index of node in schain group.
     */
    function _findNode(bytes32 schainId, uint nodeIndex) private view returns (uint) {
        uint[] memory nodesInGroup = schainsGroups[schainId];
        uint index;
        for (index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex) {
                return index;
            }
        }
        return index;
    }

}
