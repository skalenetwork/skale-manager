// SPDX-License-Identifier: AGPL-3.0-only

/*
    IECDH.sol - SKALE Manager
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

pragma solidity >=0.6.10 <0.9.0;

interface IECDH {
    function publicKey(uint256 privKey) external pure returns (uint256 qx, uint256 qy);
    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    )
        external
        pure
        returns (uint256 qx, uint256 qy);
    function jAdd(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        external
        pure
        returns (uint256 x3, uint256 z3);
    function jSub(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        external
        pure
        returns (uint256 x3, uint256 z3);
    function jMul(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        external
        pure
        returns (uint256 x3, uint256 z3);
    function jDiv(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        external
        pure
        returns (uint256 x3, uint256 z3);
    function inverse(uint256 a) external pure returns (uint256 invA);
    function ecAdd(
        uint256 x1,
        uint256 y1,
        uint256 z1,
        uint256 x2,
        uint256 y2,
        uint256 z2
    )
        external
        pure
        returns (uint256 x3, uint256 y3, uint256 z3);
    function ecDouble(
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        external
        pure
        returns (uint256 x3, uint256 y3, uint256 z3);
    function ecMul(
        uint256 d,
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        external
        pure
        returns (uint256 x3, uint256 y3, uint256 z3);
}
