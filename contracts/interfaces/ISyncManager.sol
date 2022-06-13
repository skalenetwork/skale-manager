// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISyncManager.sol - SKALE Manager
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

interface ISyncManager {
    struct IPRange {
        bytes4 startIP;
        bytes4 endIP;
    }
    event IPRangeAdded(string name, bytes4 startIP, bytes4 endIP);
    event IPRangeRemoved(string name);
    function addIPRange(string memory name, bytes4 startIP, bytes4 endIP) external;
    function removeIPRange(string memory name) external;
    function getIPRangesNumber() external view returns (uint);
    function getIPRangeByIndex(uint index) external view returns (IPRange memory);
    function getIPRangeByName(string memory name) external view returns (IPRange memory);
}
