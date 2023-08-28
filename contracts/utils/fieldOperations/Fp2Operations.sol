// SPDX-License-Identifier: AGPL-3.0-only

// cSpell:words twistb

/*
    Fp2Operations.sol - SKALE Manager
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

import { Precompiled } from "../Precompiled.sol";


library Fp2Operations {

    uint256 constant public P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    function inverseFp2(ISkaleDKG.Fp2Point memory value) internal view returns (ISkaleDKG.Fp2Point memory result) {
        uint256 p = P;
        uint256 t0 = mulmod(value.a, value.a, p);
        uint256 t1 = mulmod(value.b, value.b, p);
        uint256 t2 = mulmod(p - 1, t1, p);
        if (t0 >= t2) {
            t2 = addmod(t0, p - t2, p);
        } else {
            t2 = (p - addmod(t2, p - t0, p)) % p;
        }
        uint256 t3 = Precompiled.bigModExp(t2, p - 2, p);
        result.a = mulmod(value.a, t3, p);
        result.b = (p - mulmod(value.b, t3, p)) % p;
    }

    function addFp2(ISkaleDKG.Fp2Point memory value1, ISkaleDKG.Fp2Point memory value2)
        internal
        pure
        returns (ISkaleDKG.Fp2Point memory result)
    {
        return ISkaleDKG.Fp2Point({ a: addmod(value1.a, value2.a, P), b: addmod(value1.b, value2.b, P) });
    }

    function scalarMulFp2(ISkaleDKG.Fp2Point memory value, uint256 scalar)
        internal
        pure
        returns (ISkaleDKG.Fp2Point memory result)
    {
        return ISkaleDKG.Fp2Point({ a: mulmod(scalar, value.a, P), b: mulmod(scalar, value.b, P) });
    }

    function minusFp2(ISkaleDKG.Fp2Point memory diminished, ISkaleDKG.Fp2Point memory subtracted) internal pure
        returns (ISkaleDKG.Fp2Point memory difference)
    {
        uint256 p = P;
        if (diminished.a >= subtracted.a) {
            difference.a = addmod(diminished.a, p - subtracted.a, p);
        } else {
            difference.a = (p - addmod(subtracted.a, p - diminished.a, p)) % p;
        }
        if (diminished.b >= subtracted.b) {
            difference.b = addmod(diminished.b, p - subtracted.b, p);
        } else {
            difference.b = (p - addmod(subtracted.b, p - diminished.b, p)) % p;
        }
    }

    function mulFp2(
        ISkaleDKG.Fp2Point memory value1,
        ISkaleDKG.Fp2Point memory value2
    )
        internal
        pure
        returns (ISkaleDKG.Fp2Point memory result)
    {
        uint256 p = P;
        ISkaleDKG.Fp2Point memory point = ISkaleDKG.Fp2Point({
            a: mulmod(value1.a, value2.a, p),
            b: mulmod(value1.b, value2.b, p)});
        result.a = addmod(
            point.a,
            mulmod(p - 1, point.b, p),
            p);
        result.b = addmod(
            mulmod(
                addmod(value1.a, value1.b, p),
                addmod(value2.a, value2.b, p),
                p),
            p - addmod(point.a, point.b, p),
            p);
    }

    function squaredFp2(ISkaleDKG.Fp2Point memory value) internal pure returns (ISkaleDKG.Fp2Point memory result) {
        uint256 p = P;
        uint256 ab = mulmod(value.a, value.b, p);
        uint256 multiplication = mulmod(addmod(value.a, value.b, p), addmod(value.a, mulmod(p - 1, value.b, p), p), p);
        return ISkaleDKG.Fp2Point({ a: multiplication, b: addmod(ab, ab, p) });
    }

    function isEqual(
        ISkaleDKG.Fp2Point memory value1,
        ISkaleDKG.Fp2Point memory value2
    )
        internal
        pure
        returns (bool result)
    {
        return value1.a == value2.a && value1.b == value2.b;
    }
}
