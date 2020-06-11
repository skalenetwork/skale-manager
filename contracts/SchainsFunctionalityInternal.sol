// SPDX-License-Identifier: AGPL-3.0-only

/*
    SchainsFunctionalityInternal.sol - SKALE Manager
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

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "./GroupsFunctionality.sol";
import "./ConstantsHolder.sol";
import "./SchainsData.sol";
import "./Nodes.sol";


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionalityInternal is GroupsFunctionality {
    // informs that Schain based on some Nodes
    event SchainNodes(
        string name,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev createGroupForSchain - creates Group for Schain
     * @param schainName - name of Schain
     * @param schainId - hash by name of Schain
     * @param numberOfNodes - number of Nodes needed for this Schain
     * @param partOfNode - divisor of given type of Schain
     */
    function createGroupForSchain(
        string calldata schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint8 partOfNode) external allow(_executorName)
    {
        address dataAddress = _contractManager.getContract(_dataName);
        addGroup(schainId, numberOfNodes, bytes32(uint(partOfNode)));
        uint[] memory numberOfNodesInGroup = _generateGroup(schainId);
        SchainsData(dataAddress).setSchainPartOfNode(schainId, partOfNode);
        emit SchainNodes(
            schainName,
            schainId,
            numberOfNodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    function removeNodeFromSchain(
        uint nodeIndex,
        bytes32 groupHash
    )
        external
        allowTwo(_executorName, "SkaleDKG")
        returns (uint)
    {
        address schainsDataAddress = _contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
        uint groupIndex = findSchainAtSchainsForNode(nodeIndex, groupHash);
        uint indexOfNode = _findNode(groupHash, nodeIndex);
        IGroupsData(schainsDataAddress).removeNodeFromGroup(indexOfNode, groupHash);
        // IGroupsData(schainsDataAddress).removeExceptionNode(groupHash, nodeIndex);
        SchainsData(schainsDataAddress).removeSchainForNode(nodeIndex, groupIndex);
        return indexOfNode;
    }

    function removeNodeFromExceptions(bytes32 groupHash, uint nodeIndex) external allow(_executorName) {
        address schainsDataAddress = _contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
        IGroupsData(schainsDataAddress).removeExceptionNode(groupHash, nodeIndex);
    }

    // function removeNodeFromSchain(
    //     uint nodeIndex,
    //     bytes32 groupHash
    // )
    //     external 
    //     allowTwo(_executorName, "SkaleDKG")
    //     returns (uint) 
    // {
    //     uint groupIndex = findSchainAtSchainsForNode(nodeIndex, groupHash);
    //     uint indexOfNode = _findNode(groupHash, nodeIndex);
    //     delete groups[groupHash].nodesInGroup[indexOfNode];

    //     removeSchainForNode(nodeIndex, groupIndex);
    //     return indexOfNode;
    // }

    /**
     * @dev selectNodeToGroup - pseudo-randomly select new Node for Schain
     * @param groupIndex - hash of name of Schain
     * @return nodeIndex - global index of Node
     */
    function selectNodeToGroup(bytes32 groupIndex, uint indexOfNode) external allow(_executorName) returns (uint) {
        IGroupsData groupsData = IGroupsData(_contractManager.getContract(_dataName));
        SchainsData schainsData = SchainsData(_contractManager.getContract(_dataName));
        require(groupsData.isGroupActive(groupIndex), "Group is not active");
        uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
        uint[] memory possibleNodes = this.isEnoughNodes(groupIndex);
        require(possibleNodes.length > 0, "No any free Nodes for rotation");
        uint nodeIndex;
        uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
        do {
            uint index = random % possibleNodes.length;
            nodeIndex = possibleNodes[index];
            random = uint(keccak256(abi.encodePacked(random, nodeIndex)));
        } while (groupsData.isExceptionNode(groupIndex, nodeIndex));
        require(_removeSpace(nodeIndex, space), "Could not remove space from nodeIndex");
        schainsData.addSchainForNode(nodeIndex, groupIndex);
        groupsData.setException(groupIndex, nodeIndex);
        groupsData.setNodeInGroup(groupIndex, indexOfNode, nodeIndex);
        return nodeIndex;
    }

    /**
     * @dev getNodesDataFromTypeOfSchain - returns number if Nodes
     * and part of Node which needed to this Schain
     * @param typeOfSchain - type of Schain
     * @return numberOfNodes - number of Nodes needed to this Schain
     * @return partOfNode - divisor of given type of Schain
     */
    function getNodesDataFromTypeOfSchain(uint typeOfSchain)
        external view returns (uint numberOfNodes, uint8 partOfNode)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_SCHAIN();
        if (typeOfSchain == 1) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.TINY_DIVISOR();
        } else if (typeOfSchain == 2) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.SMALL_DIVISOR();
        } else if (typeOfSchain == 3) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.MEDIUM_DIVISOR();
        } else if (typeOfSchain == 4) {
            partOfNode = 0;
            numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_TEST_SCHAIN();
        } else if (typeOfSchain == 5) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.MEDIUM_TEST_DIVISOR();
            numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN();
        } else {
            revert("Bad schain type");
        }
    }

    function isEnoughNodes(bytes32 groupIndex) external view returns (uint[] memory result) {
        IGroupsData groupsData = IGroupsData(_contractManager.getContract(_dataName));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
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

    function isAnyFreeNode(bytes32 groupIndex) external view returns (bool) {
        IGroupsData groupsData = IGroupsData(_contractManager.getContract(_dataName));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
        uint[] memory nodesWithFreeSpace = nodes.getNodesWithFreeSpace(space);
        for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
            if (_isCorrespond(groupIndex, nodesWithFreeSpace[i])) {
                return true;
            }
        }
        return false;
    }

    function initialize(address newContractsAddress) public override initializer {
        GroupsFunctionality.initialize("SchainsFunctionality", "SchainsData", newContractsAddress);
    }

    /**
     * @dev findSchainAtSchainsForNode - finds index of Schain at schainsForNode array
     * @param nodeIndex - index of Node at common array of Nodes
     * @param schainId - hash of name of Schain
     * @return index of Schain at schainsForNode array
     */
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) public view returns (uint) {
        address dataAddress = _contractManager.contracts(keccak256(abi.encodePacked(_dataName)));
        uint length = SchainsData(dataAddress).getLengthOfSchainsForNode(nodeIndex);
        for (uint i = 0; i < length; i++) {
            if (SchainsData(dataAddress).schainsForNodes(nodeIndex, i) == schainId) {
                return i;
            }
        }
        return length;
    }

    /**
     * @dev _generateGroup - generates Group for Schain
     * @param groupIndex - index of Group
     */
    function _generateGroup(bytes32 groupIndex) internal override returns (uint[] memory nodesInGroup) {
        IGroupsData groupsData = IGroupsData(_contractManager.getContract(_dataName));
        SchainsData schainsData = SchainsData(_contractManager.getContract(_dataName));
        require(groupsData.isGroupActive(groupIndex), "Group is not active");
        
        uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
        nodesInGroup = new uint[](groupsData.getRecommendedNumberOfNodes(groupIndex));

        uint[] memory possibleNodes = this.isEnoughNodes(groupIndex);
        require(possibleNodes.length >= nodesInGroup.length, "Not enough nodes to create Schain");
        uint ignoringTail = 0;
        uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
        for (uint i = 0; i < nodesInGroup.length; ++i) {
            uint index = random % (possibleNodes.length.sub(ignoringTail));
            uint node = possibleNodes[index];
            nodesInGroup[i] = node;
            _swap(possibleNodes, index, possibleNodes.length.sub(ignoringTail) - 1);
            ++ignoringTail;

            groupsData.setException(groupIndex, node);
            schainsData.addSchainForNode(node, groupIndex);
            require(_removeSpace(node, space), "Could not remove space from Node");
        }

        // set generated group
        groupsData.setNodesInGroup(groupIndex, nodesInGroup);
        emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev _removeSpace - occupy space of given Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param space - needed space to occupy
     * @return true if space was successfully removed
     */
    function _removeSpace(uint nodeIndex, uint8 space) internal returns (bool) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        return nodes.removeSpaceFromNode(nodeIndex, space);
    }

    function _isCorrespond(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        IGroupsData groupsData = IGroupsData(_contractManager.contracts(keccak256(abi.encodePacked(_dataName))));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        return !groupsData.isExceptionNode(groupIndex, nodeIndex) && nodes.isNodeActive(nodeIndex);
    }
}
