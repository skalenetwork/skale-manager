// SPDX-License-Identifier: AGPL-3.0-only

/*
    IGroupsData.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Dmytro Stebaiev
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

/**
 * @title GroupsData - interface of GroupsData
 */
interface IGroupsData {
    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) external;
    function removeAllNodesInGroup(bytes32 groupIndex) external;
    function setNodeInGroup(bytes32 groupIndex, uint indexOfNode, uint nodeIndex) external;
    function setNodesInGroup(bytes32 groupIndex, uint[] calldata nodesInGroup) external;
    function removeExceptionNode(bytes32 groupIndex, uint nodeIndex) external;
    function removeGroup(bytes32 groupIndex) external;
    function setException(bytes32 groupIndex, uint nodeIndex) external;
    function removeNodeFromGroup(uint nodeIndex, bytes32 groupIndex) external;
    function setPublicKey(
        bytes32 groupIndex,
        uint pubKeyx1,
        uint pubKeyy1,
        uint pubKeyx2,
        uint pubKeyy2) external;
    function setGroupFailedDKG(bytes32 groupIndex) external;
    function isGroupActive(bytes32 groupIndex) external view returns (bool);
    function isExceptionNode(bytes32 groupIndex, uint nodeIndex) external view returns (bool);
    function getGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint);
    function getNodesInGroup(bytes32 schainId) external view returns (uint[] memory);
    function getGroupData(bytes32 groupIndex) external view returns (bytes32);
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view returns (uint);
    function getNumberOfNodesInGroup(bytes32 groupIndex) external view returns (uint);
    function isGroupFailedDKG(bytes32 groupIndex) external view returns (bool);
}