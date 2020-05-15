/*
    GroupsFunctionality.sol - SKALE Manager
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

import "./Permissions.sol";
import "./interfaces/ISkaleDKG.sol";


/**
 * @title SkaleVerifier - interface of SkaleVerifier
 */
interface ISkaleVerifierG {
    function verify(
        uint sigx,
        uint sigy,
        uint hashx,
        uint hashy,
        uint pkx1,
        uint pky1,
        uint pkx2,
        uint pky2) external view returns (bool);
}


/**
 * @title GroupsFunctionality - contract with some Groups functionality, will be inherited by
 * MonitorsFunctionality and SchainsFunctionality
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
    mapping (bytes32 => GroupCheck) private _exceptions;

    // name of executor contract
    string internal _executorName;

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
     * @dev removeNodeFromGroup - removes Node out of the Group
     * function could be run only by executor
     * @param indexOfNode - Nodes identifier
     * @param groupIndex - Groups identifier
     */
    function removeNodeFromGroup(uint indexOfNode, bytes32 groupIndex) external allow(_executorName) {
        uint size = groups[groupIndex].nodesInGroup.length;
        if (indexOfNode < size) {
            groups[groupIndex].nodesInGroup[indexOfNode] = groups[groupIndex].nodesInGroup[size - 1];
        }
        delete groups[groupIndex].nodesInGroup[size - 1];
        groups[groupIndex].nodesInGroup.pop();
    }

    /**
     * @dev setNodesInGroup - adds Nodes to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodesInGroup - array of indexes of Nodes which would be added to the Group
    */
    function setNodesInGroup(bytes32 groupIndex, uint[] calldata nodesInGroup) external allow(_executorName) {
        groups[groupIndex].nodesInGroup = nodesInGroup;
    }

    function setGroupFailedDKG(bytes32 groupIndex) external allow("SkaleDKG") {
        groups[groupIndex].succesfulDKG = false;
    }

    /**
     * @dev removeExceptionNode - remove exception Node from Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function removeExceptionNode(bytes32 groupIndex, uint nodeIndex) external allow(_executorName) {
        _exceptions[groupIndex].check[nodeIndex] = false;
    }

    /**
     * @dev deleteGroup - delete Group from Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function deleteGroup(bytes32 groupIndex) external allow(_executorName) {
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
     * @dev verifySignature - verify signature which create Group by Groups BLS master public key
     * @param groupIndex - Groups identifier
     * @param signatureX - first part of BLS signature
     * @param signatureY - second part of BLS signature
     * @param hashX - first part of hashed message
     * @param hashY - second part of hashed message
     * @return true - if correct, false - if not
     */
    function verifySignature(
        bytes32 groupIndex,
        uint signatureX,
        uint signatureY,
        uint hashX,
        uint hashY) external view returns (bool)
    {
        uint publicKeyx1;
        uint publicKeyy1;
        uint publicKeyx2;
        uint publicKeyy2;
        (publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2) = this.getGroupsPublicKey(groupIndex);
        address skaleVerifierAddress = _contractManager.getContract("SkaleVerifier");
        return ISkaleVerifierG(skaleVerifierAddress).verify(
            signatureX, signatureY, hashX, hashY, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2
        );
    }

    /**
     * @dev isGroupActive - checks is Group active
     * @param groupIndex - Groups identifier
     * @return true - active, false - not active
     */
    function isGroupActive(bytes32 groupIndex) external view returns (bool) {
        return groups[groupIndex].active;
    }

    /**
     * @dev isExceptionNode - checks is Node - exception at given Group
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node
     * return true - exception, false - not exception
     */
    function isExceptionNode(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        return _exceptions[groupIndex].check[nodeIndex];
    }

    /**
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

    function isGroupFailedDKG(bytes32 groupIndex) external view returns (bool) {
        return !groups[groupIndex].succesfulDKG;
    }

    /**
     * @dev getGroupsData - shows Groups extra data
     * @param groupIndex - Groups identifier
     * @return Groups extra data
     */
    function getGroupData(bytes32 groupIndex) external view returns (bytes32) {
        return groups[groupIndex].groupData;
    }

    /**
     * @dev getRecommendedNumberOfNodes - shows recommended number of Nodes
     * @param groupIndex - Groups identifier
     * @return recommended number of Nodes
     */
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view returns (uint) {
        return groups[groupIndex].recommendedNumberOfNodes;
    }

    /**
     * @dev getNumberOfNodesInGroup - shows number of Nodes in Group
     * @param groupIndex - Groups identifier
     * @return number of Nodes in Group
     */
    function getNumberOfNodesInGroup(bytes32 groupIndex) external view returns (uint) {
        return groups[groupIndex].nodesInGroup.length;
    }

    /**
     * @dev getNodesInGroup - shows Nodes in Group
     * @param groupIndex - Groups identifier
     * @return array of indexes of Nodes in Group
     */
    function getNodesInGroup(bytes32 groupIndex) external view returns (uint[] memory) {
        return groups[groupIndex].nodesInGroup;
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
        allow("SkaleManager")
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
     * @dev upgradeGroup - upgrade Group at Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function upgradeGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data)
        public
        allow("SkaleManager")
    {
        require(groups[groupIndex].active, "Group is not active");

        groups[groupIndex].recommendedNumberOfNodes = newRecommendedNumberOfNodes;
        groups[groupIndex].groupData = data;
        uint[4] memory previousKey = groups[groupIndex].groupsPublicKey;
        previousPublicKeys[groupIndex].push(previousKey);
        delete groups[groupIndex].groupsPublicKey;
        delete groups[groupIndex].nodesInGroup;
        while (groups[groupIndex].nodesInGroup.length > 0) {
            groups[groupIndex].nodesInGroup.pop();
        }

        emit GroupUpgraded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }
    
    /**
     * @dev setException - sets a Node like exception
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be notes like exception
     */
    function setException(bytes32 groupIndex, uint nodeIndex) public allow("SkaleManager") {
        _exceptions[groupIndex].check[nodeIndex] = true;
    }

    /**
     * @dev setNodeInGroup - adds Node to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be added to the Group
     */
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) public allow("SkaleManager") {
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

    /**
     * @dev _generateGroup - abstract method which would be implemented in inherited contracts
     * function generates group of Nodes
     * @param groupIndex - Groups identifier
     * return array of indexes of Nodes in Group
     */
    function _generateGroup(bytes32 groupIndex) internal virtual returns (uint[] memory);

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
