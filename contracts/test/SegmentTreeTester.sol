// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTreeTester.sol - SKALE Manager
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

pragma solidity 0.6.10;

import "../utils/SegmentTree.sol";


contract SegmentTreeTester {

    using SegmentTree for SegmentTree.SegmentTree;

    SegmentTree.SegmentTree private _tree;

    function initTree(uint elem) external {
        _tree.initLast(elem);
    }

    function addToLast(uint elem) external {
        _tree.addToLast(elem);
    }

    function addToPlace(uint8 place, uint elem) external {
        _tree.addToPlace(place, elem);
    }

    function removeFromPlace(uint8 place, uint elem) external {
        _tree.removeFromPlace(place, elem);
    }

    function moveFromPlaceToPlace(uint8 fromPlace, uint8 toPlace, uint elem) external {
        _tree.optimizedMoveFromPlaceToPlace(fromPlace, toPlace, elem);
    }

    function sumFromPlaceToLast(uint8 place) external view returns (uint) {
        return _tree.sumFromPlaceToLast(place);
    }

    function getRandomElem(uint8 place) external view returns (uint8 foundPlace) {
        (foundPlace, ) = _tree.randomNonZeroFromPlaceToLast(
            place,
            uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), place)))
        );
    }

    function getElem(uint index) external view returns (uint) {
        return _tree.getElemFromTree(index);
    }
}
