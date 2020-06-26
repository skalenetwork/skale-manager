// SPDX-License-Identifier: AGPL-3.0-only

/*
    FieldOperations.sol - SKALE Manager
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

import "@openzeppelin/contracts/math/SafeMath.sol";

import "./Precompiled.sol";


library Fp2Operations {
    using SafeMath for uint;

    struct Fp2Point {
        uint a;
        uint b;
    }

    uint constant public P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    function addFp2(Fp2Point memory value1, Fp2Point memory value2) internal pure returns (Fp2Point memory) {
        return Fp2Point({ a: addmod(value1.a, value2.a, P), b: addmod(value1.b, value2.b, P) });
    }

    function scalarMulFp2(Fp2Point memory value, uint scalar) internal pure returns (Fp2Point memory) {
        return Fp2Point({ a: mulmod(scalar, value.a, P), b: mulmod(scalar, value.b, P) });
    }

    function minusFp2(Fp2Point memory diminished, Fp2Point memory subtracted) internal pure
        returns (Fp2Point memory difference)
    {
        if (diminished.a >= subtracted.a) {
            difference.a = addmod(diminished.a, P.sub(subtracted.a), P);
        } else {
            difference.a = P.sub(addmod(subtracted.a, P.sub(diminished.a), P));
        }
        if (diminished.b >= subtracted.b) {
            difference.b = addmod(diminished.b, P.sub(subtracted.b), P);
        } else {
            difference.b = P.sub(addmod(subtracted.b, P.sub(diminished.b), P));
        }
    }

    function mulFp2(
        Fp2Point memory value1,
        Fp2Point memory value2
    )
        internal
        pure
        returns (Fp2Point memory result)
    {
        Fp2Point memory point = Fp2Point({
            a: mulmod(value1.a, value2.a, P),
            b: mulmod(value1.b, value2.b, P)});
        result.a = addmod(
            point.a,
            mulmod(P.sub(1), point.b, P),
            P);
        result.b = addmod(
            mulmod(
                addmod(value1.a, value1.b, P),
                addmod(value2.a, value2.b, P),
                P),
            P.sub(addmod(point.a, point.b, P)),
            P);
    }

    function squaredFp2(Fp2Point memory value) internal pure returns (Fp2Point memory) {
        uint ab = mulmod(value.a, value.b, P);
        uint mult = mulmod(addmod(value.a, value.b, P), addmod(value.a, mulmod(P.sub(1), value.b, P), P), P);
        return Fp2Point({ a: mult, b: addmod(ab, ab, P) });
    }

    function inverseFp2(Fp2Point memory value) internal view returns (Fp2Point memory result) {
        uint t0 = mulmod(value.a, value.a, P);
        uint t1 = mulmod(value.b, value.b, P);
        uint t2 = mulmod(P.sub(1), t1, P);
        if (t0 >= t2) {
            t2 = addmod(t0, P.sub(t2), P);
        } else {
            t2 = P.sub(addmod(t2, P.sub(t0), P));
        }
        uint t3 = Precompiled.bigModExp(t2, P.sub(2), P);
        result.a = mulmod(value.a, t3, P);
        result.b = P.sub(mulmod(value.b, t3, P));
    }

    function isEqual(
        Fp2Point memory value1,
        Fp2Point memory value2
    )
        internal
        pure
        returns (bool)
    {
        return value1.a == value2.a && value1.b == value2.b;
    }
}


library G2Operations {
    using SafeMath for uint;
    using Fp2Operations for Fp2Operations.Fp2Point;

    struct G2Point {
        Fp2Operations.Fp2Point x;
        Fp2Operations.Fp2Point y;
    }

    function getTWISTB() internal pure returns (Fp2Operations.Fp2Point memory) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return Fp2Operations.Fp2Point({
            a: 19485874751759354771024239261021720505790618469301721065564631296452457478373,
            b: 266929791119991161246907387137283842545076965332900288569378510910307636690
        });
    }

    function getG2() internal pure returns (G2Point memory) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return G2Point({
            x: Fp2Operations.Fp2Point({
                a: 10857046999023057135944570762232829481370756359578518086990519993285655852781,
                b: 11559732032986387107991004021392285783925812861821192530917403151452391805634
            }),
            y: Fp2Operations.Fp2Point({
                a: 8495653923123431417604973247489272438418190587263600148770280649306958101930,
                b: 4082367875863433681332203403145435568316851327593401208105741076214120093531
            })
        });
    }

    function getG1() internal pure returns (Fp2Operations.Fp2Point memory) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return Fp2Operations.Fp2Point({
            a: 1,
            b: 2
        });
    }

    function isG1Point(uint x, uint y) internal pure returns (bool) {
        return mulmod(y, y, Fp2Operations.P) == 
            addmod(mulmod(mulmod(x, x, Fp2Operations.P), x, Fp2Operations.P), 3, Fp2Operations.P);
    }
    function isG1(Fp2Operations.Fp2Point memory point) internal pure returns (bool) {
        return isG1Point(point.a, point.b);
    }

    function isG2Point(Fp2Operations.Fp2Point memory x, Fp2Operations.Fp2Point memory y) internal pure returns (bool) {
        if (isG2ZeroPoint(x, y)) {
            return true;
        }
        Fp2Operations.Fp2Point memory squaredY = y.squaredFp2();
        Fp2Operations.Fp2Point memory res = squaredY.minusFp2(
                x.squaredFp2().mulFp2(x)
            ).minusFp2(getTWISTB());
        return res.a == 0 && res.b == 0;
    }

    function isG2(G2Point memory value) internal pure returns (bool) {
        return isG2Point(value.x, value.y);
    }

    function isG2ZeroPoint(
        Fp2Operations.Fp2Point memory x,
        Fp2Operations.Fp2Point memory y
    )
        internal
        pure
        returns (bool)
    {
        return x.a == 0 && x.b == 0 && y.a == 1 && y.b == 0;
    }

    function isG2Zero(G2Point memory value) internal pure returns (bool) {
        return isG2ZeroPoint(value.x, value.y);
    }

    function addG2(
        G2Point memory value1,
        G2Point memory value2
    )
        internal
        view
        returns (G2Point memory sum)
    {
        if (isG2Zero(value1)) {
            return value2;
        }
        if (isG2Zero(value2)) {
            return value1;
        }
        if (isEqual(toUS(value1),toUS(value2))) {
            sum = doubleG2(value1);
        }

        Fp2Operations.Fp2Point memory s = value2.y.minusFp2(value1.y).mulFp2(value2.x.minusFp2(value1.x).inverseFp2());
        sum.x = s.squaredFp2().minusFp2(value1.x.addFp2(value2.x));
        sum.y = value1.y.addFp2(s.mulFp2(sum.x.minusFp2(value1.x)));
        sum.y.a = Fp2Operations.P.sub(sum.y.a % Fp2Operations.P);
        sum.y.b = Fp2Operations.P.sub(sum.y.b % Fp2Operations.P);
    }

    function toUS(G2Point memory value) internal pure returns (G2Point memory) {
        return G2Point({
            x: value.x.mulFp2(Fp2Operations.Fp2Point({ a: 1, b: 0 }).squaredFp2()),
            y: value.y.mulFp2(
                Fp2Operations.Fp2Point({ a: 1, b: 0 }).mulFp2(Fp2Operations.Fp2Point({ a: 1, b: 0 }).squaredFp2())
            )
        });
    }

    function isEqual(
        G2Point memory value1,
        G2Point memory value2
    )
        internal
        pure
        returns (bool)
    {
        return value1.x.isEqual(value2.x) && value1.y.isEqual(value2.y);
    }

    function doubleG2(G2Point memory value)
        internal
        view
        returns (G2Point memory result)
    {
        if (isG2Zero(value)) {
            return value;
        } else {
            Fp2Operations.Fp2Point memory s =
                value.x.squaredFp2().scalarMulFp2(3).mulFp2(value.y.scalarMulFp2(2).inverseFp2());
            result.x = s.squaredFp2().minusFp2(value.x.scalarMulFp2(2));
            result.y = value.y.addFp2(s.mulFp2(result.x.minusFp2(value.x)));
            result.y.a = Fp2Operations.P.sub(result.y.a % Fp2Operations.P);
            result.y.b = Fp2Operations.P.sub(result.y.b % Fp2Operations.P);
        }
    }

    function mulG2(
        G2Point memory value,
        uint scalar
    )
        internal
        view
        returns (G2Point memory result)
    {
        uint step = scalar;
        result = G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        G2Point memory tmp = value;
        while (step > 0) {
            if (step % 2 == 1) {
                result = addG2(result, tmp);
            }
            tmp = doubleG2(tmp);
            step >>= 1;
        }
    }
}