// SPDX-License-Identifier: AGPL-3.0-only

// cSpell:words twistb

/*
    G1Operations.sol - SKALE Manager
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

import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import { Fp2Operations } from "./Fp2Operations.sol";


library G1Operations {
    using Fp2Operations for ISkaleDKG.Fp2Point;

    function getG1Generator() internal pure returns (ISkaleDKG.Fp2Point memory generator) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return ISkaleDKG.Fp2Point({
            a: 1,
            b: 2
        });
    }

    function isG1Point(uint256 x, uint256 y) internal pure returns (bool result) {
        uint256 p = Fp2Operations.P;
        return mulmod(y, y, p) ==
            addmod(mulmod(mulmod(x, x, p), x, p), 3, p);
    }

    function isG1(ISkaleDKG.Fp2Point memory point) internal pure returns (bool result) {
        return isG1Point(point.a, point.b);
    }

    function checkRange(ISkaleDKG.Fp2Point memory point) internal pure returns (bool result) {
        return point.a < Fp2Operations.P && point.b < Fp2Operations.P;
    }

    function negate(uint256 y) internal pure returns (uint256 result) {
        return (Fp2Operations.P - y) % Fp2Operations.P;
    }

}
