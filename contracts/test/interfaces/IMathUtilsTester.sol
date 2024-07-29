// SPDX-License-Identifier: AGPL-3.0-only

/*
    IMathUtilsTester.sol - SKALE Manager
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


interface IMathUtilsTester {
    event UnderflowError(
        uint256 a,
        uint256 b
    );

    function boundedSub(uint256 a, uint256 b) external returns (uint256 result);
    function boundedSubWithoutEvent(uint256 a, uint256 b) external pure returns (uint256 result);
    function muchGreater(uint256 a, uint256 b) external pure returns (bool greater);
    function approximatelyEqual(uint256 a, uint256 b) external pure returns (bool qual);
}
