// SPDX-License-Identifier: AGPL-3.0-only

/*
    GroupsData.sol - SKALE Manager
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

import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISkaleDKG.sol";


/**
 * @title GroupsData - contract with some Groups data, will be inherited by
 * SchainsData and ValidatorsData.
 */
contract GroupsData is IGroupsData, Permissions {

    // struct to note which Node has already joined to the group
    struct GroupCheck {
        mapping (uint => bool) check;
    }

    struct Group {
        bool active;
        bytes32 groupData;
        uint[] nodesInGroup;
        uint recommendedNumberOfNodes;
        // BLS master public key
        uint[4] groupsPublicKey;
        bool succesfulDKG;
    }

    // contain all groups
    mapping (bytes32 => Group) public groups;
    // past groups common BLS public keys
    mapping (bytes32 => uint[4][]) public previousPublicKeys;
    // mapping for checking Has Node already joined to the group
    mapping (bytes32 => GroupCheck) internal _exceptions;

    // name of executor contract
    string internal _executorName;

    /**
     * @dev addGroup - creates and adds new Group to mapping
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param amountOfNodes - recommended number of Nodes in this Group
     * @param data - some extra data
     */
    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) external override allow(_executorName) {
        groups[groupIndex].active = true;
        groups[groupIndex].recommendedNumberOfNodes = amountOfNodes;
        groups[groupIndex].groupData = data;
        // Open channel in SkaleDKG
        address skaleDKGAddress = _contractManager.getContract("SkaleDKG");
        ISkaleDKG(skaleDKGAddress).openChannel(groupIndex);
    }

    /**
     * @dev setException - sets a Node like exception
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be notes like exception
     */
    function setException(bytes32 groupIndex, uint nodeIndex) external override allow(_executorName) {
        _exceptions[groupIndex].check[nodeIndex] = true;
    }


    /**
     * @dev setNodeInGroup - adds Node to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be added to the Group
     */
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) external override allow(_executorName) {
        groups[groupIndex].nodesInGroup.push(nodeIndex);
    }


    /**
     * @dev removeAllNodesInGroup - removes all added Nodes out the Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function removeAllNodesInGroup(bytes32 groupIndex) external override allow(_executorName) {
        delete groups[groupIndex].nodesInGroup;
        while (groups[groupIndex].nodesInGroup.length > 0) {
            groups[groupIndex].nodesInGroup.pop();
        }
    }


    /**
     * @dev removeGroup - remove Group from storage
     * function could be run only be executor
     * @param groupIndex - Groups identifier
     */
    function removeGroup(bytes32 groupIndex) external override allow(_executorName) {
        groups[groupIndex].active = false;
        delete groups[groupIndex].groupData;
        delete groups[groupIndex].recommendedNumberOfNodes;
        uint[4] memory previousKey = groups[groupIndex].groupsPublicKey;
        previousPublicKeys[groupIndex].push(previousKey);
        delete groups[groupIndex].groupsPublicKey;
        delete groups[groupIndex];
        // delete channel
        address skaleDKGAddress = _contractManager.getContract("SkaleDKG");

        if (ISkaleDKG(skaleDKGAddress).isChannelOpened(groupIndex)) {
            ISkaleDKG(skaleDKGAddress).deleteChannel(groupIndex);
        }
    }

    function setGroupFailedDKG(bytes32 groupIndex) external override allow("SkaleDKG") {
        groups[groupIndex].succesfulDKG = false;
    }

    /**
     * @dev isGroupActive - checks is Group active
     * @param groupIndex - Groups identifier
     * @return true - active, false - not active
     */
    function isGroupActive(bytes32 groupIndex) external view override returns (bool) {
        return groups[groupIndex].active;
    }



    // function getPreviousGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint) {
    //     uint length = previousPublicKeys[groupIndex].length;
    //     if (length == 0) {
    //         return (0, 0, 0, 0);
    //     }
    //     return (
    //         previousPublicKeys[groupIndex][length - 1][0],
    //         previousPublicKeys[groupIndex][length - 1][1],
    //         previousPublicKeys[groupIndex][length - 1][2],
    //         previousPublicKeys[groupIndex][length - 1][3]
    //     );
    // }


    /**
     * @dev getNodesInGroup - shows Nodes in Group
     * @param groupIndex - Groups identifier
     * @return array of indexes of Nodes in Group
     */
    function getNodesInGroup(bytes32 groupIndex) external view override returns (uint[] memory) {
        return groups[groupIndex].nodesInGroup;
    }

    /**
     * @dev getGroupsData - shows Groups extra data
     * @param groupIndex - Groups identifier
     * @return Groups extra data
     */
    function getGroupData(bytes32 groupIndex) external view override returns (bytes32) {
        return groups[groupIndex].groupData;
    }

    /**
     * @dev getRecommendedNumberOfNodes - shows recommended number of Nodes
     * @param groupIndex - Groups identifier
     * @return recommended number of Nodes
     */
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view override returns (uint) {
        return groups[groupIndex].recommendedNumberOfNodes;
    }



    /**
     * @dev constructor in Permissions approach
     * @param newExecutorName - name of executor contract
     * @param newContractsAddress needed in Permissions constructor
     */
    function initialize(string memory newExecutorName, address newContractsAddress) public initializer {
        Permissions.initialize(newContractsAddress);
        _executorName = newExecutorName;
    }

    function _isPublicKeyZero(bytes32 groupIndex) internal view returns (bool) {
        return groups[groupIndex].groupsPublicKey[0] == 0 &&
            groups[groupIndex].groupsPublicKey[1] == 0 &&
            groups[groupIndex].groupsPublicKey[2] == 0 &&
            groups[groupIndex].groupsPublicKey[3] == 0;
    }

}
