// SPDX-License-Identifier: AGPL-3.0-only

/*
    INodeRotation.sol - SKALE Manager
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

pragma solidity >=0.6.10 <0.9.0;

interface INodeRotation {
    /**
     * nodeIndex - index of Node which is in process of rotation (left from schain)
     * newNodeIndex - index of Node which is rotated(added to schain)
     * freezeUntil - time till which Node should be turned on
     * rotationCounter - how many _rotations were on this schain
     */
    struct Rotation {
        uint nodeIndex;
        uint newNodeIndex;
        uint freezeUntil;
        uint rotationCounter;
    }

    struct LeavingHistory {
        bytes32 schainHash;
        uint finishedRotation;
    }

    function exitFromSchain(uint nodeIndex) external returns (bool, bool);
    function freezeSchains(uint nodeIndex) external;
    function removeRotation(bytes32 schainHash) external;
    function skipRotationDelay(bytes32 schainHash) external;
    function rotateNode(
        uint nodeIndex,
        bytes32 schainHash,
        bool shouldDelay,
        bool isBadNode
    )
        external
        returns (uint newNode);
    function selectNodeToGroup(bytes32 schainHash) external returns (uint nodeIndex);
    function getRotation(bytes32 schainHash) external view returns (Rotation memory);
    function getLeavingHistory(uint nodeIndex) external view returns (LeavingHistory[] memory);
    function isRotationInProgress(bytes32 schainHash) external view returns (bool);
    function isNewNodeFound(bytes32 schainHash) external view returns (bool);
    function getPreviousNode(bytes32 schainHash, uint256 nodeIndex) external view returns (uint256);
}
