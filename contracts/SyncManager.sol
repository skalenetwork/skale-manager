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

pragma solidity 0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/utils/EnumerableSet.sol";
/**
 * @title SyncManager
 * @dev SyncManager is a contract on the mainnet 
 * that keeps a list of allowed sync IP address ranges.
 */
contract SyncManager {
    using EnumerableSet for EnumerableSet.UintSet;

    struct IPAddressRange {
        bytes4 startIP;
        bytes4 endIP;
    }

    EnumerableSet.UintSet public ipRangeNames;
    mapping (bytes32 => IPAddressRange) public ipAddressRanges;

    function addIPAddressRange(string memory name, bytes4 startIP, bytes4 endIP) external {
        uint256 ipRangeNameHash = uint256(keccak256(abi.encodePacked(name)));
        ipAddressRanges[ipRangeNameHash] = IPAddressRange(startIP, endIP);
        ipRangeNames.add(ipRangeNameHash);
    }


}
