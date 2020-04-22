/*
    TimeHellpersWithDebug.sol - SKALE Manager
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

pragma solidity 0.5.16;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/upgrades/contracts/Initializable.sol";

import "../delegation/TimeHelpers.sol";


contract TimeHelpersWithDebug is TimeHelpers, Ownable {
    struct TimeShift {
        uint pointInTime;
        uint shift;
    }

    TimeShift[] timeShift;

    function skipTime(uint sec) external onlyOwner {
        if (timeShift.length > 0) {
            timeShift.push(TimeShift({pointInTime: now, shift: timeShift[timeShift.length - 1].shift.add(sec)}));
        } else {
            timeShift.push(TimeShift({pointInTime: now, shift: sec}));
        }
    }

    function initialize() external initializer {
        Ownable.initialize(msg.sender);
    }

    function timestampToMonth(uint timestamp) public view returns (uint) {
        return super.timestampToMonth(timestamp.add(getTimeShift(timestamp)));
    }

    function monthToTimestamp(uint _month) public view returns (uint) {
        uint shiftedTimestamp = super.monthToTimestamp(_month);
        if (timeShift.length > 0) {
            uint lastTimeShiftIndex = timeShift.length - 1;
            if (timeShift[lastTimeShiftIndex].pointInTime.add(timeShift[lastTimeShiftIndex].shift) < shiftedTimestamp) {
                if (timeShift[0].pointInTime.add(timeShift[0].shift) < shiftedTimestamp) {
                    if (shiftedTimestamp < timeShift[0].pointInTime) {
                        return shiftedTimestamp;
                    } else {
                        return timeShift[0].pointInTime;
                    }
                } else {
                    uint left = 0;
                    uint right = lastTimeShiftIndex;
                    while (left + 1 < right) {
                        uint middle = left.add(right).div(2);
                        if (timeShift[middle].pointInTime.add(timeShift[middle].shift) < shiftedTimestamp) {
                            right = middle;
                        } else {
                            left = middle;
                        }
                    }
                    if (shiftedTimestamp < timeShift[right].pointInTime + timeShift[left].shift) {
                        return shiftedTimestamp.sub(timeShift[left].shift);
                    } else {
                        return timeShift[right].pointInTime;
                    }
                }
            } else {
                return shiftedTimestamp.sub(timeShift[lastTimeShiftIndex].shift);
            }
        } else {
            return shiftedTimestamp;
        }
    }

    // private

    function getTimeShift(uint timestamp) internal view returns (uint) {
        if (timeShift.length > 0) {
            if (timestamp < timeShift[0].pointInTime) {
                return 0;
            } else if (timestamp >= timeShift[timeShift.length - 1].pointInTime) {
                return timeShift[timeShift.length - 1].shift;
            } else {
                uint left = 0;
                uint right = timeShift.length - 1;
                while (left + 1 < right) {
                    uint middle = left.add(right).div(2);
                    if (timestamp < timeShift[middle].pointInTime) {
                        right = middle;
                    } else {
                        left = middle;
                    }
                }
                return timeShift[left].shift;
            }
        } else {
            return 0;
        }
    }

}