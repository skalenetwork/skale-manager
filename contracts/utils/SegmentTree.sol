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

import "./Random.sol";

/**
 * @title SegmentTree
 * @dev This library implements segment tree data structure
 * 
 * Segment tree allows effectively calculate sum of elements in sub arrays
 * by storing some amount of additional data.
 * 
 * IMPORTANT: Provided implementation assumes that arrays is indexed from 1 to n.
 * Size of initial array always must be power of 2
 * 
 * Example:
 *
 * Array:
 * +---+---+---+---+---+---+---+---+
 * | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
 * +---+---+---+---+---+---+---+---+
 *
 * Segment tree structure:
 * +-------------------------------+
 * |               36              |
 * +---------------+---------------+
 * |       10      |       26      |
 * +-------+-------+-------+-------+
 * |   3   |   7   |   11  |   15  |
 * +---+---+---+---+---+---+---+---+
 * | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
 * +---+---+---+---+---+---+---+---+
 *
 * How the segment tree is stored in an array:
 * +----+----+----+---+---+----+----+---+---+---+---+---+---+---+---+
 * | 36 | 10 | 26 | 3 | 7 | 11 | 15 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
 * +----+----+----+---+---+----+----+---+---+---+---+---+---+---+---+
 */
library SegmentTree {
    using Random for Random.RandomGenerator;
    using SafeMath for uint;    

    struct Tree {
        uint[] tree;
    }

    /**
     * @dev Allocates storage for segment tree of `size` elements
     * 
     * Requirements:
     * 
     * - `size` must be greater than 0
     * - `size` must be power of 2
     */
    function create(Tree storage segmentTree, uint size) internal {
        require(size > 0, "Size can't be 0");
        require(size & size.sub(1) == 0, "Size is not power of 2");
        segmentTree.tree = new uint[](size.mul(2).sub(1));
    }

    /**
     * @dev Allocates storage for segment tree of `size` elements
     * and sets last element to `lastElement`
     * 
     * Requirements:
     * 
     * - `size` must be greater than 0
     * - `size` must be power of 2
     */
    function createWithLastElement(Tree storage segmentTree, uint size, uint lastElement) internal {
        create(segmentTree, size);
        for (uint vertex = 1; vertex < size.mul(2); vertex = _right(vertex)) {
            segmentTree.tree[vertex.sub(1)] = lastElement;
        }
    }

    /**
     * @dev Returns amount of elements in segment tree
     */
    function getSize(Tree storage segmentTree) internal view returns (uint) {
        if (segmentTree.tree.length > 0) {
            return segmentTree.tree.length.div(2).add(1);
        } else {
            return 0;
        }
    }

    /**
     * @dev Adds `delta` to element of segment tree at `place`
     * 
     * Requirements:
     * 
     * - `place` must be in range [1, size]
     */
    function addToPlace(Tree storage self, uint place, uint delta) internal {
        require(_correctPlace(self, place), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = getSize(self);
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

    /**
     * @dev Subtracts `delta` from element of segment tree at `place`
     * 
     * Requirements:
     * 
     * - `place` must be in range [1, size]
     * - initial value of target element must be not less than `delta`
     */
    function removeFromPlace(Tree storage self, uint place, uint delta) internal {
        require(_correctPlace(self, place), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = getSize(self);
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

    /**
     * @dev Adds `delta` to element of segment tree at `toPlace`
     * and subtracts `delta` from element at `fromPlace`
     * 
     * Requirements:
     * 
     * - `fromPlace` must be in range [1, size]
     * - `toPlace` must be in range [1, size]
     * - initial value of element at `fromPlace` must be not less than `delta`
     */
    function moveFromPlaceToPlace(
        Tree storage self,
        uint fromPlace,
        uint toPlace,
        uint delta
    )
        internal
    {
        require(_correctPlace(self, fromPlace) && _correctPlace(self, toPlace), "Incorrect place");
        uint leftBound = 1;
        uint rightBound = getSize(self);
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

    /**
     * @dev Returns sum of elements in range [`place`, size]
     * 
     * Requirements:
     * 
     * - `place` must be in range [1, size]
     */
    function sumFromPlaceToLast(Tree storage self, uint place) internal view returns (uint sum) {
        require(_correctPlace(self, place), "Incorrect place");
        if (place == 1) {
            return self.tree[0];
        }
        uint leftBound = 1;
        uint rightBound = getSize(self);
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

    /**
     * @dev Returns random position in range [`place`, size]
     * with probability proportional to value stored at this position.
     * If all element in range are 0 returns 0
     * 
     * Requirements:
     * 
     * - `place` must be in range [1, size]
     */
    function getRandomNonZeroElementFromPlaceToLast(
        Tree storage self,
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
        uint rightBound = getSize(self);
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

    // /**
    //  * @dev Returns random position in range [`place`, size]
    //  * with probability proportional to value stored at this position.
    //  * If all element in range are 0 returns 0
    //  * 
    //  * Requirements:
    //  * 
    //  * - `place` must be in range [1, size]
    //  */
    // function getRandomNonZeroElementFromPlaceToLast(
    //     Tree storage self,
    //     uint place
    //     // Random.RandomGenerator memory randomGenerator
    // )
    //     internal
    //     view
    //     returns (uint, uint)
    // {
    //     require(_correctPlace(self, place), "Incorrect place");

    //     uint8 leftBound = 1;
    //     uint8 rightBound = 128;
    //     uint step = 1;
    //     uint currentSum = sumFromPlaceToLast(self, place);
    //     uint randomBeakon = uint(
    //         keccak256(abi.encodePacked(uint(blockhash(block.number.sub(1))), place, currentSum))
    //     );
    //     while(leftBound < rightBound) {
    //         uint8 middle = (leftBound + rightBound) / 2;
    //         if (place > middle) {
    //             leftBound = middle + 1;
    //             step += step + 1;
    //         } else {
    //             uint priorityB = self.tree[2 * step];
    //             uint priorityA = currentSum - priorityB;
    //             if (priorityA == 0) {
    //                 leftBound = middle + 1;
    //                 step += step + 1;
    //             } else if (priorityB == 0) {
    //                 rightBound = middle;
    //                 step += step;
    //             } else {
    //                 (bool isLeftWay, uint randomBeakon2) =
    //                     _randomWay(randomBeakon, priorityA, priorityB);
    //                 if (isLeftWay) {
    //                     rightBound = middle;
    //                     step += step;
    //                     currentSum = priorityA;
    //                 } else {
    //                     leftBound = middle + 1;
    //                     step += step + 1;
    //                     currentSum = priorityB;
    //                 }
    //                 randomBeakon = randomBeakon2;
    //             }
    //         }
    //     }
    //     if (self.tree[step - 1] == 0) {
    //         return (0, 0);
    //     }
    //     return (leftBound, randomBeakon);
    // }

    function _randomWay(
        uint salt,
        uint priorityA,
        uint priorityB
    )
        private
        pure
        returns (bool isLeftWay, uint newSalt)
    {
        newSalt = uint(keccak256(abi.encodePacked(salt, priorityA, priorityB)));
        isLeftWay = (newSalt % (priorityA + priorityB)) < priorityA;
    }

    /**
     * @dev Checks if `place` is valid position in segment tree
     */
    function _correctPlace(Tree storage self, uint place) private view returns (bool) {
        return place >= 1 && place <= getSize(self);
    }

    /**
     * @dev Calculates index of left child of the vertex
     */
    function _left(uint vertex) private pure returns (uint) {
        return vertex.mul(2);
    }

    /**
     * @dev Calculates index of right child of the vertex
     */
    function _right(uint vertex) private pure returns (uint) {
        return vertex.mul(2).add(1);
    }

    /**
     * @dev Calculates arithmetical mean of 2 numbers
     */
    function _middle(uint left, uint right) private pure returns (uint) {
        return left.add(right).div(2);
    }
}
