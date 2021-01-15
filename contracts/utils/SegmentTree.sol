// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTree.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
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


library SegmentTreeLib {
    using SafeMath for uint;

    struct SegmentTree {
        uint[] tree;
    }

    function create(SegmentTree storage segmentTree, uint n) internal {
        require(_isPowerOfTwo(n), "N must be power of 2");
        for (uint i = 0; i < n.mul(2); ++i) {
            segmentTree.tree.push(0);
        }
    }

    function add(SegmentTree storage segmentTree, uint index, uint value) internal {
        _add(segmentTree, index, value, true);
    }

    function subtract(SegmentTree storage segmentTree, uint index, uint value) internal {
        _add(segmentTree, index, value, false);
    }

    function get(SegmentTree storage segmentTree, uint index) internal view returns (uint) {
        uint n = _length(segmentTree);
        require(index < n, "Index is out of range");

        return segmentTree.tree[segmentTree.tree.length.div(2).add(index)];
    }

    function set(SegmentTree storage segmentTree, uint index, uint value) internal {
        uint n = _length(segmentTree);
        require(index < n, "Index is out of range");

        uint oldValue = get(segmentTree, index);
        if (value != oldValue) {
            if (value > oldValue) {
                add(segmentTree, index, value.sub(oldValue));
            } else {
                subtract(segmentTree, index, oldValue.sub(value));
            }
        }
    }

    function sum(SegmentTree storage segmentTree, uint from, uint to) internal view returns (uint) {
        if (from >= to) {
            return 0;
        }
        uint n = _length(segmentTree);
        require(to <= n, "Index is out of range");

        return _sum(segmentTree, 1, 0, n, from, to);
    }

    // private

    function _isPowerOfTwo(uint n) private pure returns (bool) {
        uint i;
        uint maxPowerOfTwo = 1 << 255;
        for (i = 1; i < maxPowerOfTwo; i <<= 2 ) {
            if (i == n) {
                return true;
            }
            if (i > n) {
                return false;
            }
        }
        if (n == maxPowerOfTwo) {
            return true;
        } else {
            return false;
        }
    }

    function _length(SegmentTree storage segmentTree) private view returns (uint) {
        return segmentTree.tree.length.div(2);
    }

    function _add(SegmentTree storage segmentTree, uint index, uint value, bool positive) private {
        uint n = _length(segmentTree);
        require(index < n, "Index is out of range");

        uint v = 1;
        uint left = 0;
        uint right = n;
        while (v < segmentTree.tree.length) {
            if (positive) {
                segmentTree.tree[v] = segmentTree.tree[v].add(value);
            } else {
                segmentTree.tree[v] = segmentTree.tree[v].sub(value);
            }

            uint middle = _middle(left, right);
            if (index < middle) {
                v = _left(v);
                right = middle;
            } else {
                v = _right(v);
                left = middle;
            }
        }
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

    function _sum(
        SegmentTree storage segmentTree,
        uint v,
        uint left,
        uint right,
        uint from,
        uint to
    )
        private
        view
        returns (uint)
    {
        uint middle = left.add(right).div(2);
        // while query completely lies in left or right subtree
        while (to <= middle || middle <= from) {
            if (to <= middle) {
                // query is in left subtree
                v = _left(v);
                right = middle;
            } else {
                // query is in right subtree
                v = _right(v);
                left = middle;
            }
            middle = _middle(left, right);
        }
        
        if (to == right) {
            return _sumToEnd(segmentTree, v, left, right, from);
        } else if (from == left) {
            return _sumFromBegin(segmentTree, v, left, right, to);
        } else {
            return _sum(segmentTree, v, left, right, from, middle).add(
                _sum(segmentTree, v, left, right, middle, to)
            );
        }
    }

    function _sumFromBegin(
        SegmentTree storage segmentTree,
        uint v,
        uint left,
        uint right,
        uint to
    )
        private
        view
        returns (uint sumValue)
    {
        uint middle = _middle(left, right);
        while (right != to) {
            if (to <= middle) {
                v = _left(v);
                right = middle;
                middle = _middle(left, right);
            } else {
                sumValue = sumValue.add(segmentTree.tree[_left(v)]);

                v = _right(v);
                left = middle;
                middle = _middle(left, right);
            }
        }
        sumValue = sumValue.add(segmentTree.tree[v]);
    }

    function _sumToEnd(
        SegmentTree storage segmentTree,
        uint v,
        uint left,
        uint right,
        uint from
    )
        private
        view
        returns (uint sumValue)
    {
        uint middle = _middle(left, right);
        while (left != from) {
            if (middle <= from) {
                v = _right(v);
                left = middle;
                middle = _middle(left, right);
            } else {
                sumValue = sumValue.add(segmentTree.tree[_right(v)]);

                v = _left(v);
                right = middle;
                middle = _middle(left, right);
            }
        }
        sumValue = sumValue.add(segmentTree.tree[v]);
    }
}