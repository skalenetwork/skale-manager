// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISegmentTreeTester.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
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

pragma solidity 0.8.26;


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
