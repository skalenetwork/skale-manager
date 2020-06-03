// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISchainsFunctionalityInternal.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Artem Payvin
    @author Dmytro Stebaiev
    @author Vadim Yavorsky

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

interface ISchainsFunctionalityInternal {
    function deleteGroup(bytes32 groupIndex) external;
    function selectNodeToGroup(bytes32 groupIndex) external;
    function removeNodeFromSchain(uint nodeIndex, bytes32 groupHash) external;
    function removeNodeFromExceptions(bytes32 groupHash, uint nodeIndex) external;
    function excludeNodeFromSchain(uint nodeIndex, bytes32 groupHash) external;
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) external view returns (uint, uint8);
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) external view returns (uint);
    function isEnoughNodes(bytes32 groupIndex) external view returns (uint[] memory);
}