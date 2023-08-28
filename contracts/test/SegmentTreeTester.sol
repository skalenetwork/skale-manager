// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTreeTester.sol - SKALE Manager
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

pragma solidity 0.8.17;

import { IRandom, Random, SegmentTree } from "../utils/SegmentTree.sol";

interface ISegmentTreeTester {
    function initTree() external;
    function addElemInPlaces(uint256 place, uint256 elem) external;
    function addToLast(uint256 elem) external;
    function addToPlace(uint256 place, uint256 elem) external;
    function removeFromPlace(uint256 place, uint256 elem) external;
    function moveFromPlaceToPlace(uint256 fromPlace, uint256 toPlace, uint256 elem) external;
    function sumFromPlaceToLast(uint256 place) external view returns (uint256 sum);
    function getRandomElem(uint256 place) external view returns (uint256 element);
    function getElem(uint256 index) external view returns (uint256 element);
    function getSize() external view returns (uint256 size);
}


contract SegmentTreeTester is ISegmentTreeTester {

    using SegmentTree for SegmentTree.Tree;

    SegmentTree.Tree private _tree;

    uint256[129] private _places;

    function initTree() external override {
        _tree.create(128);
        for (uint8 i = 1; i <= 128; i++) {
            if (_places[i] > 0)
                _tree.addToPlace(i, _places[i]);
        }
    }

    function addElemInPlaces(uint256 place, uint256 elem) external override {
        _places[place] = elem;
    }

    function addToLast(uint256 elem) external override {
        _tree.addToPlace(_tree.getSize(), elem);
    }

    function addToPlace(uint256 place, uint256 elem) external override {
        _tree.addToPlace(place, elem);
    }

    function removeFromPlace(uint256 place, uint256 elem) external override {
        _tree.removeFromPlace(place, elem);
    }

    function moveFromPlaceToPlace(uint256 fromPlace, uint256 toPlace, uint256 elem) external override {
        _tree.moveFromPlaceToPlace(fromPlace, toPlace, elem);
    }

    function sumFromPlaceToLast(uint256 place) external view override returns (uint256 sum) {
        return _tree.sumFromPlaceToLast(place);
    }

    function getRandomElem(uint256 place) external view override returns (uint256 element) {
        IRandom.RandomGenerator memory randomGenerator = Random.createFromEntropy(
            abi.encodePacked(uint(blockhash(block.number - 1)), place)
        );
        return _tree.getRandomNonZeroElementFromPlaceToLast(place, randomGenerator);
    }

    function getElem(uint256 index) external view override returns (uint256 element) {
        require(index < _tree.tree.length, "Incorrect index");
        return _tree.tree[index];
    }

    function getSize() external view override returns (uint256 size) {
        return _tree.getSize();
    }
}
