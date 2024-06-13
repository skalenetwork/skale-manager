// SPDX-License-Identifier: AGPL-3.0-only

/*
    TimeHelpers.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Dmytro Stebaiev

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

import {ITimeHelpers} from "@skalenetwork/skale-manager-interfaces/delegation/ITimeHelpers.sol";

import {BokkyPooBahsDateTimeLibrary} from "../thirdparty/BokkyPooBahsDateTimeLibrary.sol";

/**
 * @title TimeHelpers
 * @dev The contract performs time operations.
 *
 * These functions are used to calculate monthly and Proof of Use epochs.
 */
contract TimeHelpers is ITimeHelpers {
    uint256 private constant _ZERO_YEAR = 2020;

    function calculateProofOfUseLockEndTime(
        uint256 month,
        uint256 lockUpPeriodDays
    ) external view override returns (uint256 timestamp) {
        timestamp = BokkyPooBahsDateTimeLibrary.addDays(
            monthToTimestamp(month),
            lockUpPeriodDays
        );
    }

    function getCurrentMonth()
        external
        view
        virtual
        override
        returns (uint256 month)
    {
        return timestampToMonth(block.timestamp);
    }

    function timestampToYear(
        uint256 timestamp
    ) external view virtual override returns (uint256 year) {
        uint256 month;
        uint256 day;
        (year, month, day) = BokkyPooBahsDateTimeLibrary.timestampToDate(
            timestamp
        );
        require(year >= _ZERO_YEAR, "Timestamp is too far in the past");
        return year - _ZERO_YEAR;
    }

    function addDays(
        uint256 fromTimestamp,
        uint256 n
    ) external pure override returns (uint256 result) {
        return BokkyPooBahsDateTimeLibrary.addDays(fromTimestamp, n);
    }

    function addMonths(
        uint256 fromTimestamp,
        uint256 n
    ) external pure override returns (uint256 result) {
        return BokkyPooBahsDateTimeLibrary.addMonths(fromTimestamp, n);
    }

    function addYears(
        uint256 fromTimestamp,
        uint256 n
    ) external pure override returns (uint256 result) {
        return BokkyPooBahsDateTimeLibrary.addYears(fromTimestamp, n);
    }

    function timestampToMonth(
        uint256 timestamp
    ) public view virtual override returns (uint256 month) {
        uint256 year;
        uint256 day;
        (year, month, day) = BokkyPooBahsDateTimeLibrary.timestampToDate(
            timestamp
        );
        require(year >= _ZERO_YEAR, "Timestamp is too far in the past");
        month = month - 1 + (year - _ZERO_YEAR) * 12;
        require(month > 0, "Timestamp is too far in the past");
        return month;
    }

    function monthToTimestamp(
        uint256 month
    ) public view virtual override returns (uint256 timestamp) {
        uint256 year = _ZERO_YEAR;
        uint256 _month = month;
        year = year + _month / 12;
        _month = _month % 12;
        _month = _month + 1;
        return BokkyPooBahsDateTimeLibrary.timestampFromDate(year, _month, 1);
    }
}
