// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTree.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Aretm Payvin

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

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

library SegmentTree {

    struct SegmentTree {
        uint[255] tree;
    }
    uint8 private constant _FIRST = 1;
    uint8 private constant _LAST = 128;

    function initLast(SegmentTree storage self, uint elem) internal {
        for(uint8 i = 1; i <= 8; i++) {
            self.tree[2 ** i - 2] = elem;
        }
    }

    function addToLast(SegmentTree storage self, uint delta) internal {
        for(uint8 i = 1; i <= 8; i++) {
            self.tree[2 ** i - 2] += delta;
        }
    }

    function addToPlace(SegmentTree storage self, uint8 place, uint delta) internal {
        require(correctSpace(place), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        self.tree[0] += delta;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                self.tree[step + 1] += delta;
                step += step + 1;
            } else {
                rightBound = middle;
                self.tree[step] += delta;
                step += step;
            }
        }
        self.tree[leftBound] += delta;
    }

    function removeFromPlace(SegmentTree storage self, uint8 place, uint delta) internal {
        require(correctSpace(place), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        self.tree[0] -= delta;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                self.tree[step + 1] += delta;
                step += step + 1;
            } else {
                rightBound = middle;
                self.tree[step] -= delta;
                step += step;
            }
        }
        self.tree[leftBound] -= delta;
    }

    // function optimizedMoveFromPlaceToPlace(SegmentTree storage self, uint8 fromPlace, uint8 toPlace) internal {}

    function sumFromPlaceToLast(SegmentTree storage self, uint8 place) internal view returns (uint sum) {
        require(correctSpace(place), "Incorrect place");
        if (place == _FIRST) {
            return self.tree[0];
        } else if (place == _LAST) {
            return 0;
        }
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                rightBound = middle;
                sum += self.tree[step + 1];
                step += step;
            }
        }
        sum += self.tree[step];
    }

    function randomNonZeroFromPlaceToLast(
        SegmentTree storage self,
        uint8 place,
        uint salt
    )
        internal
        view
        returns (uint8)
    {
        require(correctSpace(place), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        uint randomBeakon = salt;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                if (self.tree[step] == 0) {
                    leftBound = middle + 1;
                    step += step + 1;
                    if (self.tree[step + 1] == 0) {
                        return 0;
                    }
                } else if (self.tree[step + 1] == 0) {
                    rightBound = middle;
                    step += step;
                } else {
                    (bool isLeftWay, uint randomBeakon2) =
                        randomWay(randomBeakon, self.tree[step], self.tree[step + 1]);
                    if (isLeftWay) {
                        rightBound = middle;
                        step += step;
                    } else {
                        leftBound = middle + 1;
                        step += step + 1;
                    }
                    randomBeakon = randomBeakon2;
                }
            }
        }
        return leftBound;
    }

    function correctSpace(uint8 place) internal pure returns (bool) {
        return place >= _FIRST && place <= _LAST;
    }

    function randomWay(
        uint salt,
        uint priorityA,
        uint priorityB
    )
        internal
        pure
        returns (bool isLeftWay, uint newSalt)
    {
        newSalt = uint(keccak256(abi.encodePacked(salt, priorityA, priorityB)));
        isLeftWay = newSalt % (priorityA + priorityB) < priorityA;

    }
}