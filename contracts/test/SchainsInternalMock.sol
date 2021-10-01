// SPDX-License-Identifier: AGPL-3.0-only

/*
    SchainsInternalMock.sol - SKALE Manager
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
pragma abicoder v2;

import "../SchainsInternal.sol";

contract SchainsInternalMock is SchainsInternal {

    function removePlaceOfSchainOnNode(bytes32 schainHash, uint nodeIndex) external {
        delete placeOfSchainOnNode[schainHash][nodeIndex];
    }

    function removeNodeToLocked(uint nodeIndex) external {
        mapping(uint => bytes32[]) storage nodeToLocked = _getNodeToLockedSchains();
        delete nodeToLocked[nodeIndex];
    }

    function removeSchainToExceptionNode(bytes32 schainHash) external {
        mapping(bytes32 => uint[]) storage schainToException = _getSchainToExceptionNodes();
        delete schainToException[schainHash];
    }
}