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

pragma solidity 0.8.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";

import "./interfaces/ISkaleDKG.sol";
import "./utils/Random.sol";

import "./ConstantsHolder.sol";
import "./Nodes.sol";


/**
 * @title SchainsInternal
 * @dev Contract contains all functionality logic to internally manage Schains.
 */
contract SchainsInternal is Permissions, ISchainsInternal {

    using Random for Random.RandomGenerator;
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

    bytes32 public constant SCHAIN_TYPE_MANAGER_ROLE = keccak256("SCHAIN_TYPE_MANAGER_ROLE");
    bytes32 public constant DEBUGGER_ROLE = keccak256("DEBUGGER_ROLE");

    /**
     * @dev Emitted when schain type added.
     */
    event SchainTypeAdded(uint indexed schainType, uint partOfNode, uint numberOfNodes);

    /**
     * @dev Emitted when schain type removed.
     */
    event SchainTypeRemoved(uint indexed schainType);

    modifier onlySchainTypeManager() {
        require(hasRole(SCHAIN_TYPE_MANAGER_ROLE, msg.sender), "SCHAIN_TYPE_MANAGER_ROLE is required");
        _;
    }

    modifier onlyDebugger() {
        require(hasRole(DEBUGGER_ROLE, msg.sender), "DEBUGGER_ROLE is required");
        _;
    }

    /**
     * @dev Allows Schain contract to initialize an schain.
     */
    function initializeSchain(
        string calldata name,
        address from,
        uint lifetime,
        uint deposit) external allow("Schains")
    {
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        schains[schainHash].name = name;
        schains[schainHash].owner = from;
        schains[schainHash].startDate = block.timestamp;
        schains[schainHash].startBlock = block.number;
        schains[schainHash].lifetime = lifetime;
        schains[schainHash].deposit = deposit;
        schains[schainHash].index = numberOfSchains;
        isSchainActive[schainHash] = true;
        numberOfSchains++;
        schainsAtSystem.push(schainHash);
        usedSchainNames[schainHash] = true;
    }

    /**
     * @dev Allows Schain contract to create a node group for an schain.
     */
    function createGroupForSchain(
        bytes32 schainHash,
        uint numberOfNodes,
        uint8 partOfNode
    )
        external
        allow("Schains")
        returns (uint[] memory)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        schains[schainHash].partOfNode = partOfNode;
        if (partOfNode > 0) {
            sumOfSchainsResources = sumOfSchainsResources +
                numberOfNodes * constantsHolder.TOTAL_SPACE_ON_NODE() / partOfNode;
        }
        return _generateGroup(schainHash, numberOfNodes);
    }

    /**
     * @dev Allows Schains contract to set index in owner list.
     */
    function setSchainIndex(bytes32 schainHash, address from) external allow("Schains") {
        schains[schainHash].indexInOwnerList = schainIndexes[from].length;
        schainIndexes[from].push(schainHash);
    }

    /**
     * @dev Allows Schains contract to change the Schain lifetime through
     * an additional SKL token deposit.
     */
    function changeLifetime(bytes32 schainHash, uint lifetime, uint deposit) external allow("Schains") {
        schains[schainHash].deposit = schains[schainHash].deposit + deposit;
        schains[schainHash].lifetime = schains[schainHash].lifetime + lifetime;
    }

    /**
     * @dev Allows Schains contract to remove an schain from the network.
     * Generally schains are not removed from the system; instead they are
     * simply allowed to expire.
     */
    function removeSchain(bytes32 schainHash, address from) external allow("Schains") {
        isSchainActive[schainHash] = false;
        uint length = schainIndexes[from].length;
        uint index = schains[schainHash].indexInOwnerList;
        if (index != length - 1) {
            bytes32 lastSchainHash = schainIndexes[from][length - 1];
            schains[lastSchainHash].indexInOwnerList = index;
            schainIndexes[from][index] = lastSchainHash;
        }
        schainIndexes[from].pop();

        // TODO:
        // optimize
        for (uint i = 0; i + 1 < schainsAtSystem.length; i++) {
            if (schainsAtSystem[i] == schainHash) {
                schainsAtSystem[i] = schainsAtSystem[schainsAtSystem.length - 1];
                break;
            }
        }
        schainsAtSystem.pop();

        delete schains[schainHash];
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
        uint indexOfLastNode = schainsGroups[schainHash].length - 1;

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

        removeSchainForNode(nodeIndex, placeOfSchainOnNode[schainHash][nodeIndex] - 1);
        delete placeOfSchainOnNode[schainHash][nodeIndex];
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        nodes.addSpaceToNode(nodeIndex, schains[schainHash].partOfNode);
    }

    /**
     * @dev Allows Schains contract to delete a group of schains
     */
    function deleteGroup(bytes32 schainHash) external allow("Schains") {
        // delete channel
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        delete schainsGroups[schainHash];
        skaleDKG.deleteChannel(schainHash);
    }

    /**
     * @dev Allows Schain and NodeRotation contracts to set a Node like
     * exception for a given schain and nodeIndex.
     */
    function setException(bytes32 schainHash, uint nodeIndex) external allowTwo("Schains", "NodeRotation") {
        _setException(schainHash, nodeIndex);
    }

    /**
     * @dev Allows Schains and NodeRotation contracts to add node to an schain
     * group.
     */
    function setNodeInGroup(bytes32 schainHash, uint nodeIndex) external allowTwo("Schains", "NodeRotation") {
        if (holesForSchains[schainHash].length == 0) {
            schainsGroups[schainHash].push(nodeIndex);
        } else {
            schainsGroups[schainHash][holesForSchains[schainHash][0]] = nodeIndex;
            uint min = type(uint).max;
            uint index = 0;
            for (uint i = 1; i < holesForSchains[schainHash].length; i++) {
                if (min > holesForSchains[schainHash][i]) {
                    min = holesForSchains[schainHash][i];
                    index = i;
                }
            }
            if (min == type(uint).max) {
                delete holesForSchains[schainHash];
            } else {
                holesForSchains[schainHash][0] = min;
                holesForSchains[schainHash][index] =
                    holesForSchains[schainHash][holesForSchains[schainHash].length - 1];
                holesForSchains[schainHash].pop();
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
    function addSchainType(uint8 partOfNode, uint numberOfNodes) external onlySchainTypeManager {
        require(_keysOfSchainTypes.add(numberOfSchainTypes + 1), "Schain type is already added");
        schainTypes[numberOfSchainTypes + 1].partOfNode = partOfNode;
        schainTypes[numberOfSchainTypes + 1].numberOfNodes = numberOfNodes;
        numberOfSchainTypes++;
        emit SchainTypeAdded(numberOfSchainTypes, partOfNode, numberOfNodes);
    }

    /**
     * @dev Allows Admin to remove schain type
     */
    function removeSchainType(uint typeOfSchain) external onlySchainTypeManager {
        require(_keysOfSchainTypes.remove(typeOfSchain), "Schain type is already removed");
        delete schainTypes[typeOfSchain].partOfNode;
        delete schainTypes[typeOfSchain].numberOfNodes;
        emit SchainTypeRemoved(typeOfSchain);
    }

    /**
     * @dev Allows Admin to set number of schain types
     */
    function setNumberOfSchainTypes(uint newNumberOfSchainTypes) external onlySchainTypeManager {
        numberOfSchainTypes = newNumberOfSchainTypes;
    }

    function removeNodeFromAllExceptionSchains(uint nodeIndex) external allow("SkaleManager") {
        uint len = _nodeToLockedSchains[nodeIndex].length;
        if (len > 0) {
            for (uint i = len; i > 0; i--) {
                removeNodeFromExceptions(_nodeToLockedSchains[nodeIndex][i - 1], nodeIndex);
            }
        }
    }

    function makeSchainNodesInvisible(bytes32 schainHash) external allowTwo("NodeRotation", "SkaleDKG") {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < _schainToExceptionNodes[schainHash].length; i++) {
            nodes.makeNodeInvisible(_schainToExceptionNodes[schainHash][i]);
        }
    }

    function makeSchainNodesVisible(bytes32 schainHash) external allowTwo("NodeRotation", "SkaleDKG") {
        _makeSchainNodesVisible(schainHash);
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
    function getSchainsPartOfNode(bytes32 schainHash) external view returns (uint8) {
        return schains[schainHash].partOfNode;
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
    function getSchainHashesByAddress(address from) external view returns (bytes32[] memory) {
        return schainIndexes[from];
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
    function getSchainHashesForNode(uint nodeIndex) external view returns (bytes32[] memory) {
        return schainsForNodes[nodeIndex];
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
    function getSchainOwner(bytes32 schainHash) external view returns (address) {
        return schains[schainHash].owner;
    }

    /**
     * @dev Checks whether schain name is available.
     * TODO Need to delete - copy of web3.utils.soliditySha3
     */
    function isSchainNameAvailable(string calldata name) external view returns (bool) {
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        return schains[schainHash].owner == address(0) &&
            !usedSchainNames[schainHash] &&
            keccak256(abi.encodePacked(name)) != keccak256(abi.encodePacked("Mainnet"));
    }

    /**
     * @dev Checks whether schain lifetime has expired.
     */
    function isTimeExpired(bytes32 schainHash) external view returns (bool) {
        return uint(schains[schainHash].startDate) + schains[schainHash].lifetime < block.timestamp;
    }

    /**
     * @dev Checks whether address is owner of schain.
     */
    function isOwnerAddress(address from, bytes32 schainHash) external view override returns (bool) {
        return schains[schainHash].owner == from;
    }

    /**
     * @dev Checks whether schain exists.
     */
    function isSchainExist(bytes32 schainHash) external view returns (bool) {
        return keccak256(abi.encodePacked(schains[schainHash].name)) != keccak256(abi.encodePacked(""));
    }

    /**
     * @dev Returns schain name.
     */
    function getSchainName(bytes32 schainHash) external view returns (string memory) {
        return schains[schainHash].name;
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
    function getNumberOfNodesInGroup(bytes32 schainHash) external view returns (uint) {
        return schainsGroups[schainHash].length;
    }

    /**
     * @dev Returns nodes in an schain group.
     */
    function getNodesInGroup(bytes32 schainHash) external view returns (uint[] memory) {
        return schainsGroups[schainHash];
    }

    /**
     * @dev Checks whether sender is a node address from a given schain group.
     */
    function isNodeAddressesInGroup(bytes32 schainHash, address sender) external view override returns (bool) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < schainsGroups[schainHash].length; i++) {
            if (nodes.getNodeAddress(schainsGroups[schainHash][i]) == sender) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Returns node index in schain group.
     */
    function getNodeIndexInGroup(bytes32 schainHash, uint nodeId) external view returns (uint) {
        for (uint index = 0; index < schainsGroups[schainHash].length; index++) {
            if (schainsGroups[schainHash][index] == nodeId) {
                return index;
            }
        }
        return schainsGroups[schainHash].length;
    }

    /**
     * @dev Checks whether there are any nodes with free resources for given
     * schain.
     */
    function isAnyFreeNode(bytes32 schainHash) external view returns (bool) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        uint8 space = schains[schainHash].partOfNode;
        return nodes.countNodesWithFreeSpace(space) > 0;
    }

    /**
     * @dev Returns whether any exceptions exist for node in a schain group.
     */
    function checkException(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        return _exceptionsForGroups[schainHash][nodeIndex];
    }

    function checkHoleForSchain(bytes32 schainHash, uint indexOfNode) external view returns (bool) {
        for (uint i = 0; i < holesForSchains[schainHash].length; i++) {
            if (holesForSchains[schainHash][i] == indexOfNode) {
                return true;
            }
        }
        return false;
    }

    function checkSchainOnNode(uint nodeIndex, bytes32 schainHash) external view returns (bool) {
        return placeOfSchainOnNode[schainHash][nodeIndex] != 0;
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
    function addSchainForNode(uint nodeIndex, bytes32 schainHash) public allowTwo("Schains", "NodeRotation") {
        if (holesForNodes[nodeIndex].length == 0) {
            schainsForNodes[nodeIndex].push(schainHash);
            placeOfSchainOnNode[schainHash][nodeIndex] = schainsForNodes[nodeIndex].length;
        } else {
            uint lastHoleOfNode = holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
            schainsForNodes[nodeIndex][lastHoleOfNode] = schainHash;
            placeOfSchainOnNode[schainHash][nodeIndex] = lastHoleOfNode + 1;
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
        if (schainIndex == length - 1) {
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
        for (uint i = len; i > 0; i--) {
            if (_nodeToLockedSchains[nodeIndex][i - 1] == schainHash) {
                if (i != len) {
                    _nodeToLockedSchains[nodeIndex][i - 1] = _nodeToLockedSchains[nodeIndex][len - 1];
                }
                _nodeToLockedSchains[nodeIndex].pop();
                break;
            }
        }
        len = _schainToExceptionNodes[schainHash].length;
        for (uint i = len; i > 0; i--) {
            if (_schainToExceptionNodes[schainHash][i - 1] == nodeIndex) {
                if (i != len) {
                    _schainToExceptionNodes[schainHash][i - 1] = _schainToExceptionNodes[schainHash][len - 1];
                }
                _schainToExceptionNodes[schainHash].pop();
                break;
            }
        }
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
    function _generateGroup(bytes32 schainHash, uint numberOfNodes) private returns (uint[] memory nodesInGroup) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        uint8 space = schains[schainHash].partOfNode;
        nodesInGroup = new uint[](numberOfNodes);

        require(nodes.countNodesWithFreeSpace(space) >= nodesInGroup.length, "Not enough nodes to create Schain");
        Random.RandomGenerator memory randomGenerator = Random.createFromEntropy(
            abi.encodePacked(uint(blockhash(block.number - 1)), schainHash)
        );
        for (uint i = 0; i < numberOfNodes; i++) {
            uint node = nodes.getRandomNodeWithFreeSpace(space, randomGenerator);
            nodesInGroup[i] = node;
            _setException(schainHash, node);
            addSchainForNode(node, schainHash);
            nodes.makeNodeInvisible(node);
            require(nodes.removeSpaceFromNode(node, space), "Could not remove space from Node");
        }
        // set generated group
        schainsGroups[schainHash] = nodesInGroup;
        _makeSchainNodesVisible(schainHash);
    }

    function _setException(bytes32 schainHash, uint nodeIndex) private {
        _exceptionsForGroups[schainHash][nodeIndex] = true;
        _nodeToLockedSchains[nodeIndex].push(schainHash);
        _schainToExceptionNodes[schainHash].push(nodeIndex);
    }

    function _makeSchainNodesVisible(bytes32 schainHash) private {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        for (uint i = 0; i < _schainToExceptionNodes[schainHash].length; i++) {
            nodes.makeNodeVisible(_schainToExceptionNodes[schainHash][i]);
        }
    }

    /**
     * @dev Returns local index of node in schain group.
     */
    function _findNode(bytes32 schainHash, uint nodeIndex) private view returns (uint) {
        uint[] memory nodesInGroup = schainsGroups[schainHash];
        uint index;
        for (index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex) {
                return index;
            }
        }
        return index;
    }

}
