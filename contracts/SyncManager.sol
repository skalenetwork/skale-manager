// SPDX-License-Identifier: AGPL-3.0-only

/*
    SyncManager.sol - SKALE Manager
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

pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title SyncManager
 * @dev SyncManager is a contract on the mainnet 
 * that keeps a list of allowed sync IP address ranges.
 */
contract SyncManager {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

    struct IPAddressRange {
        bytes4 startIP;
        bytes4 endIP;
    }

    EnumerableSetUpgradeable.Bytes32Set private _ipRangeNames;
    mapping (bytes32 => IPAddressRange) public ipAddressRanges;

    function addIPAddressRange(string memory name, bytes4 startIP, bytes4 endIP) external {
        bytes32 ipRangeNameHash = keccak256(abi.encodePacked(name));
        require(_ipRangeNames.add(ipRangeNameHash), "The range name is already taken");
        ipAddressRanges[ipRangeNameHash] = IPAddressRange(startIP, endIP);
    }


}
