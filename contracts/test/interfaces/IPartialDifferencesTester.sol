// SPDX-License-Identifier: AGPL-3.0-only

/*
    IPartialDifferencesTester.sol - SKALE Manager
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

pragma solidity 0.8.17;


interface IPartialDifferencesTester {
    function createSequence() external;
    function addToSequence(uint256 sequence, uint256 diff, uint256 month) external;
    function subtractFromSequence(uint256 sequence, uint256 diff, uint256 month) external;
    function getAndUpdateSequenceItem(uint256 sequence, uint256 month) external returns (uint256 item);
    function reduceSequence(
        uint256 sequence,
        uint256 a,
        uint256 b,
        uint256 month
    ) external;
    function latestSequence() external view returns (uint256 id);
}
