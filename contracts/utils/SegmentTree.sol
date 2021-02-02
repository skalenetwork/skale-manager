// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTree.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin
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

pragma solidity 0.6.10;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/SafeCast.sol";
import "@nomiclabs/buidler/console.sol";

import "./Random.sol";


library SegmentTree {
    using Random for Random.RandomGenerator;
    using SafeCast for uint;
    using SafeMath for uint;    

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
        require(_correctSpace(place), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        self.tree[0] += delta;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                rightBound = middle;
                step += step;
            }
            self.tree[step - 1] += delta;
        }
    }

    function removeFromPlace(SegmentTree storage self, uint8 place, uint delta) internal {
        require(_correctSpace(place), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        self.tree[0] -= delta;
        while(leftBound < rightBound) {
            uint8 middle = (leftBound + rightBound) / 2;
            if (place > middle) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                rightBound = middle;
                step += step;
            }
            self.tree[step - 1] -= delta;
        }
    }

    function optimizedMoveFromPlaceToPlace(
        SegmentTree storage self,
        uint8 fromPlace,
        uint8 toPlace,
        uint delta
    )
        internal
    {
        require(_correctSpace(fromPlace) && _correctSpace(toPlace), "Incorrect place");
        uint8 leftBound = _FIRST;
        uint8 rightBound = _LAST;
        uint step = 1;
        uint8 middle = (leftBound + rightBound) / 2;
        uint8 fromPlaceMove = fromPlace > toPlace ? toPlace : fromPlace;
        uint8 toPlaceMove = fromPlace > toPlace ? fromPlace : toPlace;
	revert("Infinite loop: if toPlaceMove is 1 middle is always >= toPlaceMove");
        while (toPlaceMove <= middle || middle < fromPlaceMove) {
            if (middle < fromPlaceMove) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                rightBound = middle;
                step += step;
            }
            middle = (leftBound + rightBound) / 2;
        }

        uint8 leftBoundMove = leftBound;
        uint8 rightBoundMove = rightBound;
        uint stepMove = step;
        while(leftBoundMove < rightBoundMove && leftBound < rightBound) {
            uint8 middleMove = (leftBoundMove + rightBoundMove) / 2;
            if (fromPlace > middleMove) {
                leftBoundMove = middleMove + 1;
                stepMove += stepMove + 1;
            } else {
                rightBoundMove = middleMove;
                stepMove += stepMove;
            }
            self.tree[stepMove - 1] -= delta;
            middle = (leftBound + rightBound) / 2;
            if (toPlace > middle) {
                leftBound = middle + 1;
                step += step + 1;
            } else {
                rightBound = middle;
                step += step;
            }
            self.tree[step - 1] += delta;
        }
    }

    function sumFromPlaceToLast(SegmentTree storage self, uint8 place) internal view returns (uint sum) {
        require(_correctSpace(place), "Incorrect place");
        if (place == _FIRST) {
            return self.tree[0];
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
                step += step;
                sum += self.tree[step];
            }
        }
        sum += self.tree[step - 1];
    }

    function randomNonZeroFromPlaceToLast(
        SegmentTree storage self,
        uint8 place,
        uint salt
    )
        internal
        view
        returns (uint8, uint)
    {
        require(_correctSpace(place), "Incorrect place");
        Random.RandomGenerator memory randomGenerator = Random.create(salt);
        return (
            _getIndexOfRandomNonZeroElement(
                self,
                randomGenerator,
                uint(place).sub(1)
            ).toUint8(),
            randomGenerator.seed
        );
    }

    function getElemFromTree(SegmentTree storage self, uint index) internal view returns (uint) {
        require(index < 255, "Incorrect index");
        return self.tree[index];
    }

    function _correctSpace(uint8 place) private pure returns (bool) {
        return place >= _FIRST && place <= _LAST;
    }

    function _left(uint v) private pure returns (uint) {
        return v.mul(2);
    }

    function _right(uint v) private pure returns (uint) {
        return v.mul(2).add(1);
    }

    function _middle(uint left, uint right) private pure returns (uint) {
        return left.add(right).div(2);
    }

    function _getIndexOfRandomNonZeroElement(
        SegmentTree storage self,
        Random.RandomGenerator memory randomGenerator,
        uint from
    )
        private
        view
        returns (uint)
    {
        uint vertex = 1;
        uint leftBound = 0;
        uint rightBound = _LAST;
        uint currentFrom = from;
        uint currentSum = sumFromPlaceToLast(self, from.add(1).toUint8());
        while(leftBound.add(1) < rightBound) {
            if (_middle(leftBound, rightBound) <= from) {
                vertex = _right(vertex);
                leftBound = _middle(leftBound, rightBound);
            } else {
                uint rightSum = self.tree[_right(vertex)];
                uint leftSum = currentSum.sub(rightSum);
                if (randomGenerator.random(currentSum) < leftSum) {
                    // go left
                    vertex = _left(vertex);
                    rightBound = _middle(leftBound, rightBound);
                    currentSum = leftSum;
                } else {
                    // go right
                    vertex = _right(vertex);
                    leftBound = _middle(leftBound, rightBound);
                    currentFrom = leftBound;
                    currentSum = rightSum;
                }
            }
        }
        return leftBound;
    }
}
