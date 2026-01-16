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

pragma solidity 0.8.17;

import { EnumerableSetUpgradeable, SchainsInternal } from "../SchainsInternal.sol";
import { ISchainsInternalMock } from "./interfaces/ISchainsInternalMock.sol";
import { Permissions } from "../Permissions.sol";

contract SchainsInternalMock is SchainsInternal, ISchainsInternalMock {

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    mapping (bytes32 => EnumerableSetUpgradeable.AddressSet) private _nodeAddressInSchainTest;

    function removePlaceOfSchainOnNode(bytes32 schainHash, uint256 nodeIndex) external override {
        delete placeOfSchainOnNode[schainHash][nodeIndex];
    }

    function removeNodeToLocked(uint256 nodeIndex) external override {
        mapping(uint256 => bytes32[]) storage nodeToLocked = _getNodeToLockedSchains();
        delete nodeToLocked[nodeIndex];
    }

    function removeSchainToExceptionNode(bytes32 schainHash) external override {
        mapping(bytes32 => uint256[]) storage schainToException = _getSchainToExceptionNodes();
        delete schainToException[schainHash];
    }

    // To avoid having to set initialize() as virtual
    // solhint-disable-next-line comprehensive-interface
    function initializeMock(address contractsAddress) external initializer {
        Permissions._permissionsInit(contractsAddress);

        numberOfSchains = 0;
        sumOfSchainsResources = 0;
        numberOfSchainTypes = 0;
    }

    function _addAddressToSchain(
        bytes32,
        address
    )
        internal
        override
        pure
        returns (bool successful)
    {
        return true;
    }

    function _removeAddressFromSchain(
        bytes32,
        address
    )
        internal
        override
        pure
        returns (bool successful)
    {
        return true;
    }
}
