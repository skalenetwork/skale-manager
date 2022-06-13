// SPDX-License-Identifier: AGPL-3.0-only

/*
    ITimeHelpers.sol - SKALE Manager
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

interface ITimeHelpers {
    function calculateProofOfUseLockEndTime(uint month, uint lockUpPeriodDays) external view returns (uint timestamp);
    function getCurrentMonth() external view returns (uint);
    function timestampToYear(uint timestamp) external view returns (uint);
    function timestampToMonth(uint timestamp) external view returns (uint);
    function monthToTimestamp(uint month) external view returns (uint timestamp);
    function addDays(uint fromTimestamp, uint n) external pure returns (uint);
    function addMonths(uint fromTimestamp, uint n) external pure returns (uint);
    function addYears(uint fromTimestamp, uint n) external pure returns (uint);
}
