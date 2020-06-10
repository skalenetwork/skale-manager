/*
    Groups.sol - SKALE Manager
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

import "./Permissions.sol";
import "./interfaces/ISkaleDKG.sol";



/**
 * @title Groups - contract will be inherited by
 * Monitors and Schains
 */
abstract contract Groups is Permissions {

    // informs that Group is added
    event GroupAdded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    // informs that an exception set in Group
    event ExceptionSet(
        bytes32 groupIndex,
        uint exceptionNodeIndex,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is deleted
    event GroupDeleted(
        bytes32 groupIndex,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is upgraded
    event GroupUpgraded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is generated
    event GroupGenerated(
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

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

    function setGroupFailedDKG(bytes32 groupIndex) external allow("SkaleDKG") {
        groups[groupIndex].succesfulDKG = false;
    }

    /**
     * @dev createGroup - creates and adds new Group to Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function createGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data)
        public
        allowTwo("Schains","SkaleManager")
    {
        groups[groupIndex].active = true;
        groups[groupIndex].recommendedNumberOfNodes = newRecommendedNumberOfNodes;
        groups[groupIndex].groupData = data;

        emit GroupAdded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }



    /**
     * @dev deleteGroup - delete Group from Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function deleteGroup(bytes32 groupIndex) public allow(_executorName) {
        require(groups[groupIndex].active, "Group is not active");
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
        delete groups[groupIndex].nodesInGroup;
        while (groups[groupIndex].nodesInGroup.length > 0) {
            groups[groupIndex].nodesInGroup.pop();
        }
        emit GroupDeleted(groupIndex, uint32(block.timestamp), gasleft());
    }
    
    /**
     * @dev setException - sets a Node like exception
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be notes like exception
     */
    function setException(bytes32 groupIndex, uint nodeIndex) public allow(_executorName) {
        _exceptions[groupIndex].check[nodeIndex] = true;
    }

    /**
     * @dev setNodeInGroup - adds Node to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be added to the Group
     */
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) public allow(_executorName) {
        groups[groupIndex].nodesInGroup.push(nodeIndex);
    }

    /**
     * @dev contructor in Permissions approach
     * @param newExecutorName - name of executor contract
     * @param newContractsAddress needed in Permissions constructor
     */
    function initialize(string memory newExecutorName, address newContractsAddress) public initializer {
        Permissions.initialize(newContractsAddress);
        _executorName = newExecutorName;
    }

    /**
     * @dev isGroupActive - checks is Group active
     * @param groupIndex - Groups identifier
     * @return true - active, false - not active
     */
    function isGroupActive(bytes32 groupIndex) public view returns (bool) {
        return groups[groupIndex].active;
    }

    /**
     * @dev getGroupsData - shows Groups extra data
     * @param groupIndex - Groups identifier
     * @return Groups extra data
     */
    function getGroupData(bytes32 groupIndex) public view returns (bytes32) {
        return groups[groupIndex].groupData;
    }

    /**
     * @dev getRecommendedNumberOfNodes - shows recommended number of Nodes
     * @param groupIndex - Groups identifier
     * @return recommended number of Nodes
     */
    function getRecommendedNumberOfNodes(bytes32 groupIndex) public view returns (uint) {
        return groups[groupIndex].recommendedNumberOfNodes;
    }

    /**
     * @dev getNodesInGroup - shows Nodes in Group
     * @param groupIndex - Groups identifier
     * @return array of indexes of Nodes in Group
     */
    function getNodesInGroup(bytes32 groupIndex) public view returns (uint[] memory) {
        return groups[groupIndex].nodesInGroup;
    }

    /**
     * @dev _generateGroup - abstract method which would be implemented in inherited contracts
     * function generates group of Nodes
     * @param groupIndex - Groups identifier
     * return array of indexes of Nodes in Group
     */
    // function _generateGroup(bytes32 groupIndex) internal virtual returns (uint[] memory);

    function _isPublicKeyZero(bytes32 groupIndex) internal view returns (bool) {
        return groups[groupIndex].groupsPublicKey[0] == 0 &&
            groups[groupIndex].groupsPublicKey[1] == 0 &&
            groups[groupIndex].groupsPublicKey[2] == 0 &&
            groups[groupIndex].groupsPublicKey[3] == 0;
    }

    function _swap(uint[] memory array, uint index1, uint index2) internal pure {
        uint buffer = array[index1];
        array[index1] = array[index2];
        array[index2] = buffer;
    }
}
