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

pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./Groups.sol";
import "./ConstantsHolder.sol";
import "./Nodes.sol";



/**
 * @title SchainsInternal - contract contains all functionality logic to manage Schains
 */
contract SchainsInternal is Groups {

    struct Schain {
        string name;
        address owner;
        uint indexInOwnerList;
        uint8 partOfNode;
        uint lifetime;
        uint32 startDate;
        uint startBlock;
        uint deposit;
        uint64 index;
    }

    /**
    nodeIndex - index of Node which is in process of rotation
    startedRotation - timestamp of starting node rotation
    inRotation - if true, only nodeIndex able to rotate
    */
    struct Rotation {
        uint nodeIndex;
        uint newNodeIndex;
        uint freezeUntil;
        uint rotationCounter;
    }

    struct LeavingHistory {
        bytes32 schainIndex;
        uint finishedRotation;
    }

    // mapping which contain all schains
    mapping (bytes32 => Schain) public schains;
    // mapping shows schains by owner's address
    mapping (address => bytes32[]) public schainIndexes;
    // mapping shows schains which Node composed in
    mapping (uint => bytes32[]) public schainsForNodes;

    mapping (uint => uint[]) public holesForNodes;

    mapping (bytes32 => Rotation) public rotations;

    mapping (uint => LeavingHistory[]) public leavingHistory;

    // array which contain all schains
    bytes32[] public schainsAtSystem;

    uint64 public numberOfSchains;
    // total resources that schains occupied
    uint public sumOfSchainsResources;



    /**
     * @dev initializeSchain - initializes Schain
     * function could be run only by executor
     * @param name - SChain name
     * @param from - Schain owner
     * @param lifetime - initial lifetime of Schain
     * @param deposit - given amount of SKL
     */
    function initializeSchain(
        string calldata name,
        address from,
        uint lifetime,
        uint deposit) external allow(_executorName)
    {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        schains[schainId].name = name;
        schains[schainId].owner = from;
        schains[schainId].startDate = uint32(block.timestamp);
        schains[schainId].startBlock = block.number;
        schains[schainId].lifetime = lifetime;
        schains[schainId].deposit = deposit;
        schains[schainId].index = numberOfSchains;
        numberOfSchains++;
        schainsAtSystem.push(schainId);
    }

    /**
     * @dev setPublicKey - sets BLS master public key
     * function could be run only by SkaleDKG
     * @param groupIndex - Groups identifier
     * @param publicKeyx1 }
     * @param publicKeyy1 } parts of BLS master public key
     * @param publicKeyx2 }
     * @param publicKeyy2 }
     */
    function setPublicKey(
        bytes32 groupIndex,
        uint publicKeyx1,
        uint publicKeyy1,
        uint publicKeyx2,
        uint publicKeyy2) external allow("SkaleDKG")
    {
        if (!_isPublicKeyZero(groupIndex)) {
            uint[4] memory previousKey = groups[groupIndex].groupsPublicKey;
            previousPublicKeys[groupIndex].push(previousKey);
        }
        groups[groupIndex].succesfulDKG = true;
        groups[groupIndex].groupsPublicKey[0] = publicKeyx1;
        groups[groupIndex].groupsPublicKey[1] = publicKeyy1;
        groups[groupIndex].groupsPublicKey[2] = publicKeyx2;
        groups[groupIndex].groupsPublicKey[3] = publicKeyy2;
    }



    /**
     * @dev setSchainIndex - adds Schain's hash to owner
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param from - Schain owner
     */
    function setSchainIndex(bytes32 schainId, address from) external allow(_executorName) {
        schains[schainId].indexInOwnerList = schainIndexes[from].length;
        schainIndexes[from].push(schainId);
    }

    /**
     * @dev changeLifetime - changes Lifetime for Schain
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param lifetime - time which would be added to lifetime of Schain
     * @param deposit - amount of SKL which payed for this time
     */
    function changeLifetime(bytes32 schainId, uint lifetime, uint deposit) external allow(_executorName) {
        schains[schainId].deposit = schains[schainId].deposit.add(deposit);
        schains[schainId].lifetime = schains[schainId].lifetime.add(lifetime);
    }

    /**
     * @dev removeSchain - removes Schain from the system
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param from - owner of Schain
     */
    function removeSchain(bytes32 schainId, address from) external allow(_executorName) {
        uint length = schainIndexes[from].length;
        uint index = schains[schainId].indexInOwnerList;
        if (index != length - 1) {
            bytes32 lastSchainId = schainIndexes[from][length - 1];
            schains[lastSchainId].indexInOwnerList = index;
            schainIndexes[from][index] = lastSchainId;
        }
        delete schainIndexes[from][length - 1];
        schainIndexes[from].pop();

        // TODO:
        // optimize
        for (uint i = 0; i + 1 < schainsAtSystem.length; i++) {
            if (schainsAtSystem[i] == schainId) {
                schainsAtSystem[i] = schainsAtSystem[schainsAtSystem.length - 1];
                break;
            }
        }
        delete schainsAtSystem[schainsAtSystem.length - 1];
        schainsAtSystem.pop();

        delete schains[schainId];
        numberOfSchains--;
    }

    function removeNodeFromSchain(
        uint nodeIndex,
        bytes32 groupHash
    )
        external
        allowTwo(_executorName, "SkaleDKG")
        returns (uint)
    {
        uint groupIndex = findSchainAtSchainsForNode(nodeIndex, groupHash);
        uint indexOfNode = _findNode(groupHash, nodeIndex);
        // uint size = groups[groupHash].nodesInGroup.length;
        // if (indexOfNode < size) {
        //     groups[groupHash].nodesInGroup[indexOfNode] = groups[groupHash].nodesInGroup[size - 1];
        // }
        delete groups[groupHash].nodesInGroup[indexOfNode];
        // groups[groupHash].nodesInGroup.pop();

        removeSchainForNode(nodeIndex, groupIndex);
        return indexOfNode;
    }

    function removeNodeFromExceptions(bytes32 groupHash, uint nodeIndex) external allow(_executorName) {
        _exceptions[groupHash].check[nodeIndex] = false;
    }

    function redirectOpenChannel(bytes32 schainId) external allow("Schains") {
        ISkaleDKG(_contractManager.getContract("SkaleDKG")).openChannel(schainId);
    }


    /**
     * @dev generateGroup - generates Group for Schain
     * @param groupIndex - index of Group
     */
    function generateGroup(bytes32 groupIndex) external allow(_executorName) returns (uint[] memory nodesInGroup) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        require(isGroupActive(groupIndex), "Group is not active");
        uint8 space = uint8(uint(getGroupData(groupIndex)));
        nodesInGroup = new uint[](getRecommendedNumberOfNodes(groupIndex));

        uint[] memory possibleNodes = isEnoughNodes(groupIndex);
        require(possibleNodes.length >= nodesInGroup.length, "Not enough nodes to create Schain");
        uint ignoringTail = 0;
        uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
        for (uint i = 0; i < nodesInGroup.length; ++i) {
            uint index = random % (possibleNodes.length.sub(ignoringTail));
            uint node = possibleNodes[index];
            nodesInGroup[i] = node;
            _swap(possibleNodes, index, possibleNodes.length.sub(ignoringTail) - 1);
            ++ignoringTail;

            setException(groupIndex, node);
            addSchainForNode(node, groupIndex);
            require(nodes.removeSpaceFromNode(node, space), "Could not remove space from Node");
        }

        // set generated group
        groups[groupIndex].nodesInGroup = nodesInGroup;
        emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev setSchainPartOfNode - sets how much Schain would be occupy of Node
     * function could be run onlye by executor
     * @param schainId - hash by Schain name
     * @param partOfNode - occupied space
     */
    function setSchainPartOfNode(bytes32 schainId, uint8 partOfNode) external allow(_executorName) {
        schains[schainId].partOfNode = partOfNode;
        if (partOfNode > 0) {
            sumOfSchainsResources = sumOfSchainsResources.add(
                (128 / partOfNode) * groups[schainId].nodesInGroup.length);
        }
    }

    function startRotation(bytes32 schainIndex, uint nodeIndex) external allow(_executorName) {
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        rotations[schainIndex].nodeIndex = nodeIndex;
        rotations[schainIndex].freezeUntil = now + constants.rotationDelay();
    }

    function finishRotation(
        bytes32 schainIndex,
        uint nodeIndex,
        uint newNodeIndex)
        external allow(_executorName)
    {
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        leavingHistory[nodeIndex].push(LeavingHistory(schainIndex, now + constants.rotationDelay()));
        rotations[schainIndex].newNodeIndex = newNodeIndex;
        rotations[schainIndex].rotationCounter++;
        address skaleDKGAddress = _contractManager.getContract("SkaleDKG");
        ISkaleDKG(skaleDKGAddress).reopenChannel(schainIndex);
    }

    function removeRotation(bytes32 schainIndex) external allow(_executorName) {
        delete rotations[schainIndex];
    }

    function skipRotationDelay(bytes32 schainIndex) external onlyOwner {
        rotations[schainIndex].freezeUntil = now;
    }

    function getRotation(bytes32 schainIndex) external view returns (Rotation memory) {
        return rotations[schainIndex];
    }

    function getLeavingHistory(uint nodeIndex) external view returns (LeavingHistory[] memory) {
        return leavingHistory[nodeIndex];
    }

    /**
     * @dev getSchains - gets all Schains at the system
     * @return array of hashes by Schain names
     */
    function getSchains() external view returns (bytes32[] memory) {
        return schainsAtSystem;
    }

    /**
     * @dev getSchainsPartOfNode - gets occupied space for given Schain
     * @param schainId - hash by Schain name
     * @return occupied space
     */
    function getSchainsPartOfNode(bytes32 schainId) external view returns (uint8) {
        return schains[schainId].partOfNode;
    }

    /**
     * @dev getSchainListSize - gets number of created Schains at the system by owner
     * @param from - owner of Schain
     * return number of Schains
     */
    function getSchainListSize(address from) external view returns (uint) {
        return schainIndexes[from].length;
    }

    /**
     * @dev getSchainIdsByAddress - gets array of hashes by Schain names which owned by `from`
     * @param from - owner of some Schains
     * @return array of hashes by Schain names
     */
    function getSchainIdsByAddress(address from) external view returns (bytes32[] memory) {
        return schainIndexes[from];
    }

    /**
     * @dev getSchainIdsForNode - returns array of hashes by Schain names,
     * which given Node composed
     * @param nodeIndex - index of Node
     * @return array of hashes by Schain names
     */
    function getSchainIdsForNode(uint nodeIndex) external view returns (bytes32[] memory) {
        return schainsForNodes[nodeIndex];
    }

    function getSchainOwner(bytes32 schainId) external view returns (address) {
        return schains[schainId].owner;
    }

    /**
     * @dev isSchainNameAvailable - checks is given name available
     * Need to delete - copy of web3.utils.soliditySha3
     * @param name - possible new name of Schain
     * @return if available - true, else - false
     */
    function isSchainNameAvailable(string calldata name) external view returns (bool) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        return schains[schainId].owner == address(0);
    }

    /**
     * @dev isTimeExpired - checks is Schain lifetime expired
     * @param schainId - hash by Schain name
     * @return if expired - true, else - false
     */
    function isTimeExpired(bytes32 schainId) external view returns (bool) {
        return schains[schainId].startDate.add(schains[schainId].lifetime) < block.timestamp;
    }

    /**
     * @dev isOwnerAddress - checks is `from` - owner of `schainId` Schain
     * @param from - owner of Schain
     * @param schainId - hash by Schain name
     * @return if owner - true, else - false
     */
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool) {
        return schains[schainId].owner == from;
    }

    function isSchainExist(bytes32 schainId) external view returns (bool) {
        return keccak256(abi.encodePacked(schains[schainId].name)) != keccak256(abi.encodePacked(""));
    }

    function getSchainName(bytes32 schainId) external view returns (string memory) {
        return schains[schainId].name;
    }

    function getActiveSchain(uint nodeIndex) external view returns (bytes32) {
        for (uint i = schainsForNodes[nodeIndex].length; i > 0; i--) {
            if (schainsForNodes[nodeIndex][i - 1] != bytes32(0)) {
                return schainsForNodes[nodeIndex][i - 1];
            }
        }
        return bytes32(0);
    }

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


    function isGroupFailedDKG(bytes32 groupIndex) external view returns (bool) {
        return !groups[groupIndex].succesfulDKG;
    }

    /**
     * @dev getNumberOfNodesInGroup - shows number of Nodes in Group
     * @param groupIndex - Groups identifier
     * @return number of Nodes in Group
     */
    function getNumberOfNodesInGroup(bytes32 groupIndex) external view returns (uint) {
        return groups[groupIndex].nodesInGroup.length;
    }

    /*
     * @dev getGroupsPublicKey - shows Groups public key
     * @param groupIndex - Groups identifier
     * @return publicKey(x1, y1, x2, y2) - parts of BLS master public key
     */
    function getGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint) {
        return (
            groups[groupIndex].groupsPublicKey[0],
            groups[groupIndex].groupsPublicKey[1],
            groups[groupIndex].groupsPublicKey[2],
            groups[groupIndex].groupsPublicKey[3]
        );
    }

    function getPreviousGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint) {
        uint length = previousPublicKeys[groupIndex].length;
        if (length == 0) {
            return (0, 0, 0, 0);
        }
        return (
            previousPublicKeys[groupIndex][length - 1][0],
            previousPublicKeys[groupIndex][length - 1][1],
            previousPublicKeys[groupIndex][length - 1][2],
            previousPublicKeys[groupIndex][length - 1][3]
        );
    }

    function isAnyFreeNode(bytes32 groupIndex) external view returns (bool) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        uint8 space = uint8(uint(getGroupData(groupIndex)));
        uint[] memory nodesWithFreeSpace = nodes.getNodesWithFreeSpace(space);
        for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
            if (_isCorrespond(groupIndex, nodesWithFreeSpace[i])) {
                return true;
            }
        }
        return false;
    }

    function checkException(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        return _exceptions[groupIndex].check[nodeIndex];
    }

    function initialize(address newContractsAddress) public override initializer {
        Groups.initialize("Schains", newContractsAddress);

        numberOfSchains = 0;
        sumOfSchainsResources = 0;
    }

    /**
     * @dev addSchainForNode - adds Schain hash to Node
     * function could be run only by executor
     * @param nodeIndex - index of Node
     * @param schainId - hash by Schain name
     */
    function addSchainForNode(uint nodeIndex, bytes32 schainId) public allow(_executorName) {
        if (holesForNodes[nodeIndex].length == 0) {
            schainsForNodes[nodeIndex].push(schainId);
        } else {
            schainsForNodes[nodeIndex][holesForNodes[nodeIndex][0]] = schainId;
            uint min = uint(-1);
            uint index = 0;
            for (uint i = 1; i < holesForNodes[nodeIndex].length; i++) {
                if (min > holesForNodes[nodeIndex][i]) {
                    min = holesForNodes[nodeIndex][i];
                    index = i;
                }
            }
            if (min == uint(-1)) {
                delete holesForNodes[nodeIndex];
            } else {
                holesForNodes[nodeIndex][0] = min;
                holesForNodes[nodeIndex][index] = holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
                delete holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
                holesForNodes[nodeIndex].pop();
            }
        }
    }

    /**
     * @dev removesSchainForNode - clean given Node of Schain
     * function could be run only by executor
     * @param nodeIndex - index of Node
     * @param schainIndex - index of Schain in schainsForNodes array by this Node
     */
    function removeSchainForNode(uint nodeIndex, uint schainIndex) public allowTwo(_executorName, "SkaleDKG") {
        uint length = schainsForNodes[nodeIndex].length;
        if (schainIndex == length - 1) {
            delete schainsForNodes[nodeIndex][length - 1];
            schainsForNodes[nodeIndex].pop();
        } else {
            schainsForNodes[nodeIndex][schainIndex] = bytes32(0);
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
     * @dev getLengthOfSchainsForNode - returns number of Schains which contain given Node
     * @param nodeIndex - index of Node
     * @return number of Schains
     */
    function getLengthOfSchainsForNode(uint nodeIndex) public view returns (uint) {
        return schainsForNodes[nodeIndex].length;
    }

    /**
     * @dev findSchainAtSchainsForNode - finds index of Schain at schainsForNode array
     * @param nodeIndex - index of Node at common array of Nodes
     * @param schainId - hash of name of Schain
     * @return index of Schain at schainsForNode array
     */
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) public view returns (uint) {
        uint length = getLengthOfSchainsForNode(nodeIndex);
        for (uint i = 0; i < length; i++) {
            if (schainsForNodes[nodeIndex][i] == schainId) {
                return i;
            }
        }
        return length;
    }

    function isEnoughNodes(bytes32 groupIndex) public view returns (uint[] memory result) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        uint8 space = uint8(uint(getGroupData(groupIndex)));
        uint[] memory nodesWithFreeSpace = nodes.getNodesWithFreeSpace(space);
        uint counter = 0;
        for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
            if (!_isCorrespond(groupIndex, nodesWithFreeSpace[i])) {
                counter++;
            }
        }
        if (counter < nodesWithFreeSpace.length) {
            result = new uint[](nodesWithFreeSpace.length.sub(counter));
            counter = 0;
            for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
                if (_isCorrespond(groupIndex, nodesWithFreeSpace[i])) {
                    result[counter] = nodesWithFreeSpace[i];
                    counter++;
                }
            }
        }
    }

    function _isCorrespond(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        return !_exceptions[groupIndex].check[nodeIndex] && nodes.isNodeActive(nodeIndex);
    }

    /**
     * @dev findNode - find local index of Node in Schain
     * @param groupIndex - Groups identifier
     * @param nodeIndex - global index of Node
     * @return local index of Node in Schain
     */
    function _findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint) {
        uint[] memory nodesInGroup = groups[groupIndex].nodesInGroup;
        uint index;
        for (index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex) {
                return index;
            }
        }
        return index;
    }

}
