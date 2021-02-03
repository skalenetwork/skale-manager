// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTree.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
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
import "@nomiclabs/buidler/console.sol";

import "./Random.sol";


library SegmentTree {
    using Random for Random.RandomGenerator;
    using SafeMath for uint;    

    struct SegmentTree {
        uint[] tree;
    }

    function create(SegmentTree storage segmentTree, uint n) internal {
        require(n > 0, "Size can't be 0");
        require(n & n.sub(1) == 0, "Size is not power of 2");
        segmentTree.tree = new uint[](n.mul(2).sub(1));
    }

    function createWithLastElement(SegmentTree storage segmentTree, uint n, uint lastElement) internal {
        create(segmentTree, n);
        for (uint vertex = 1; vertex < n.mul(2); vertex = _right(vertex)) {
            segmentTree.tree[vertex.sub(1)] = lastElement;
        }
    }

    function size(SegmentTree storage segmentTree) internal view returns (uint) {
        return segmentTree.tree.length.div(2).add(1);
    }

    function addToPlace(SegmentTree storage self, uint place, uint delta) internal {
        require(_correctPlace(self, place), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = size(self);
        uint step = 1;
        self.tree[0] = self.tree[0].add(delta);
        while(leftBound < rightBound) {
            uint middle = leftBound.add(rightBound).div(2);
            if (place > middle) {
                leftBound = middle.add(1);
                step = step.add(step).add(1);
            } else {
                rightBound = middle;
                step = step.add(step);
            }
            self.tree[step.sub(1)] = self.tree[step.sub(1)].add(delta);
        }
    }

    function removeFromPlace(SegmentTree storage self, uint place, uint delta) internal {
        require(_correctPlace(self, place), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = size(self);
        uint step = 1;
        self.tree[0] = self.tree[0].sub(delta);
        while(leftBound < rightBound) {
            uint middle = leftBound.add(rightBound).div(2);
            if (place > middle) {
                leftBound = middle.add(1);
                step = step.add(step).add(1);
            } else {
                rightBound = middle;
                step = step.add(step);
            }
            self.tree[step.sub(1)] = self.tree[step.sub(1)].sub(delta);
        }
    }

    function moveFromPlaceToPlace(
        SegmentTree storage self,
        uint fromPlace,
        uint toPlace,
        uint delta
    )
        internal
    {
        require(_correctPlace(self, fromPlace) && _correctPlace(self, toPlace), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = size(self);
        uint step = 1;
        uint middle = leftBound.add(rightBound).div(2);
        uint fromPlaceMove = fromPlace > toPlace ? toPlace : fromPlace;
        uint toPlaceMove = fromPlace > toPlace ? fromPlace : toPlace;
        while (toPlaceMove <= middle || middle < fromPlaceMove) {
            if (middle < fromPlaceMove) {
                leftBound = middle.add(1);
                step = step.add(step).add(1);
            } else {
                rightBound = middle;
                step = step.add(step);
            }
            middle = leftBound.add(rightBound).div(2);
        }

        uint leftBoundMove = leftBound;
        uint rightBoundMove = rightBound;
        uint stepMove = step;
        while(leftBoundMove < rightBoundMove && leftBound < rightBound) {
            uint middleMove = leftBoundMove.add(rightBoundMove).div(2);
            if (fromPlace > middleMove) {
                leftBoundMove = middleMove.add(1);
                stepMove = stepMove.add(stepMove).add(1);
            } else {
                rightBoundMove = middleMove;
                stepMove = stepMove.add(stepMove);
            }
            self.tree[stepMove.sub(1)] = self.tree[stepMove.sub(1)].sub(delta);
            middle = leftBound.add(rightBound).div(2);
            if (toPlace > middle) {
                leftBound = middle.add(1);
                step = step.add(step).add(1);
            } else {
                rightBound = middle;
                step = step.add(step);
            }
            self.tree[step.sub(1)] = self.tree[step.sub(1)].add(delta);
        }
    }

    function sumFromPlaceToLast(SegmentTree storage self, uint place) internal view returns (uint sum) {
        require(_correctPlace(self, place), "Incorrect place");
        if (place == 1) {
            return self.tree[0];
        }
        uint leftBound = 1;
        uint rightBound = size(self);
        uint step = 1;
        while(leftBound < rightBound) {
            uint middle = leftBound.add(rightBound).div(2);
            if (place > middle) {
                leftBound = middle.add(1);
                step = step.add(step).add(1);
            } else {
                rightBound = middle;
                step = step.add(step);
                sum = sum.add(self.tree[step]);
            }
        }
        sum = sum.add(self.tree[step.sub(1)]);
    }

    function getRandomNonZeroElementFromPlaceToLast(
        SegmentTree storage self,
        uint place,
        Random.RandomGenerator memory randomGenerator
    )
        internal
        view
        returns (uint)
    {
        require(_correctPlace(self, place), "Incorrect place");

        uint vertex = 1;
        uint leftBound = 0;
        uint rightBound = size(self);
        uint currentFrom = place.sub(1);
        uint currentSum = sumFromPlaceToLast(self, place);
        if (currentSum == 0) {
            return 0;
        }
        while(leftBound.add(1) < rightBound) {
            if (_middle(leftBound, rightBound) <= currentFrom) {
                vertex = _right(vertex);
                leftBound = _middle(leftBound, rightBound);
            } else {
                uint rightSum = self.tree[_right(vertex).sub(1)];
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
        return leftBound.add(1);
    }

    function getElemFromTree(SegmentTree storage self, uint index) internal view returns (uint) {
        require(index < 255, "Incorrect index");
        return self.tree[index];
    }

    function _correctPlace(SegmentTree storage self, uint place) private view returns (bool) {
        return place >= 1 && place <= size(self);
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
}
