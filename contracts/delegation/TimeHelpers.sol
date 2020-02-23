/*
    TimeHellper.sol - SKALE Manager
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

pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../thirdparty/BokkyPooBahsDateTimeLibrary.sol";


contract TimeHelpers {
    using SafeMath for uint;

    uint constant ZERO_YEAR = 2020;

    function getNextMonthStart() external view returns (uint timestamp) {
        return getNextMonthStartFromDate(now);
    }

    function calculateDelegationEndTime(
        uint requestTime,
        uint delegationPeriod,
        uint redelegationPeriod
    )
        external
        view
        returns (uint timestamp)
    {
        uint year;
        uint month;
        (year, month, ) = BokkyPooBahsDateTimeLibrary.timestampToDate(requestTime);

        month = month.add(delegationPeriod + 1);
        if (month > 12) {
            year = year.add((month - 1) / 12);
            month = (month - 1) % 12 + 1;
        }
        timestamp = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, 1);

        if (now > timestamp) {
            uint currentYear;
            uint currentMonth;
            (currentYear, currentMonth, ) = BokkyPooBahsDateTimeLibrary.timestampToDate(now);
            currentMonth = currentMonth.add((currentYear - year).mul(12));

            month = month.add(((currentMonth - month).div(redelegationPeriod) + 1).mul(redelegationPeriod));
            if (month > 12) {
                year = year.add((month - 1) / 12);
                month = (month - 1) % 12 + 1;
            }
            timestamp = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, 1);
        }
    }

    function addMonths(uint fromTimestamp, uint n) external pure returns (uint) {
        uint year;
        uint month;
        uint day;
        uint hour;
        uint minute;
        uint second;
        (year, month, day, hour, minute, second) = BokkyPooBahsDateTimeLibrary.timestampToDateTime(fromTimestamp);
        month = month.add(n);
        if (month > 12) {
            year = year.add((month - 1) / 12);
            month = (month - 1) % 12 + 1;
        }
        return BokkyPooBahsDateTimeLibrary.timestampFromDateTime(
            year,
            month,
            day,
            hour,
            minute,
            second);
    }

    function monthToTimestamp(uint _month) external pure returns (uint timestamp) {
        uint year = ZERO_YEAR;
        uint month = _month;
        year += month / 12;
        month %= 12;
        month += 1;
        return BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, 1);
    }

    function getCurrentMonth() external view returns (uint) {
        return timestampToMonth(now);
    }

    function timestampToMonth(uint timestamp) public pure returns (uint) {
        uint year;
        uint month;
        (year, month, ) = BokkyPooBahsDateTimeLibrary.timestampToDate(timestamp);
        require(year >= ZERO_YEAR, "Timestamp is too far in the past");
        month = month - 1 + 12 * (year - ZERO_YEAR);
        require(month > 0, "Timestamp is too far in the past");
        return month;
    }

    function getNextMonthStartFromDate(uint dateTimestamp) public pure returns (uint timestamp) {
        uint year;
        uint month;
        (year, month, ) = BokkyPooBahsDateTimeLibrary.timestampToDate(dateTimestamp);
        month++;
        if (month > 12) {
            year++;
            month = 1;
        }
        timestamp = BokkyPooBahsDateTimeLibrary.timestampFromDate(year, month, 1);
    }
}
