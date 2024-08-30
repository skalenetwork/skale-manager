// SPDX-License-Identifier: AGPL-3.0-only

// cSpell:words twistb

/*
    G2Operations.sol - SKALE Manager
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

pragma solidity ^0.8.17;

import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import { Fp2Operations } from "./Fp2Operations.sol";


library G2Operations {
    using Fp2Operations for ISkaleDKG.Fp2Point;

    function doubleG2(ISkaleDKG.G2Point memory value)
        internal
        view
        returns (ISkaleDKG.G2Point memory result)
    {
        if (isG2Zero(value)) {
            return value;
        } else {
            ISkaleDKG.Fp2Point memory s =
                value.x.squaredFp2().scalarMulFp2(3).mulFp2(value.y.scalarMulFp2(2).inverseFp2());
            result.x = s.squaredFp2().minusFp2(value.x.addFp2(value.x));
            result.y = value.y.addFp2(s.mulFp2(result.x.minusFp2(value.x)));
            uint256 p = Fp2Operations.P;
            result.y.a = (p - result.y.a) % p;
            result.y.b = (p - result.y.b) % p;
        }
    }

    function addG2(
        ISkaleDKG.G2Point memory value1,
        ISkaleDKG.G2Point memory value2
    )
        internal
        view
        returns (ISkaleDKG.G2Point memory sum)
    {
        if (isG2Zero(value1)) {
            return value2;
        }
        if (isG2Zero(value2)) {
            return value1;
        }
        if (isEqual(value1, value2)) {
            return doubleG2(value1);
        }
        if (value1.x.isEqual(value2.x)) {
            sum.x.a = 0;
            sum.x.b = 0;
            sum.y.a = 1;
            sum.y.b = 0;
            return sum;
        }

        ISkaleDKG.Fp2Point memory s = value2.y
            .minusFp2(value1.y)
            .mulFp2(
                value2.x
                    .minusFp2(value1.x)
                    .inverseFp2()
            );
        sum.x = s.squaredFp2().minusFp2(value1.x.addFp2(value2.x));
        sum.y = value1.y.addFp2(s.mulFp2(sum.x.minusFp2(value1.x)));
        uint256 p = Fp2Operations.P;
        sum.y.a = (p - sum.y.a) % p;
        sum.y.b = (p - sum.y.b) % p;
    }

    function getTWISTB() internal pure returns (ISkaleDKG.Fp2Point memory point) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return ISkaleDKG.Fp2Point({
            a: 19485874751759354771024239261021720505790618469301721065564631296452457478373,
            b: 266929791119991161246907387137283842545076965332900288569378510910307636690
        });
    }

    function getG2Generator() internal pure returns (ISkaleDKG.G2Point memory point) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return ISkaleDKG.G2Point({
            x: ISkaleDKG.Fp2Point({
                a: 10857046999023057135944570762232829481370756359578518086990519993285655852781,
                b: 11559732032986387107991004021392285783925812861821192530917403151452391805634
            }),
            y: ISkaleDKG.Fp2Point({
                a: 8495653923123431417604973247489272438418190587263600148770280649306958101930,
                b: 4082367875863433681332203403145435568316851327593401208105741076214120093531
            })
        });
    }

    function getG2Zero() internal pure returns (ISkaleDKG.G2Point memory point) {
        // Current solidity version does not support Constants of non-value type
        // so we implemented this function
        return ISkaleDKG.G2Point({
            x: ISkaleDKG.Fp2Point({
                a: 0,
                b: 0
            }),
            y: ISkaleDKG.Fp2Point({
                a: 1,
                b: 0
            })
        });
    }

    function isG2Point(
        ISkaleDKG.Fp2Point memory x,
        ISkaleDKG.Fp2Point memory y
    )
        internal
        pure
        returns (bool result)
    {
        if (isG2ZeroPoint(x, y)) {
            return true;
        }
        ISkaleDKG.Fp2Point memory squaredY = y.squaredFp2();
        ISkaleDKG.Fp2Point memory res = squaredY.minusFp2(
                x.squaredFp2().mulFp2(x)
            ).minusFp2(getTWISTB());
        return res.a == 0 && res.b == 0;
    }

    function isG2(ISkaleDKG.G2Point memory value) internal pure returns (bool result) {
        return isG2Point(value.x, value.y);
    }

    function isG2ZeroPoint(
        ISkaleDKG.Fp2Point memory x,
        ISkaleDKG.Fp2Point memory y
    )
        internal
        pure
        returns (bool result)
    {
        return x.a == 0 && x.b == 0 && y.a == 1 && y.b == 0;
    }

    function isG2Zero(ISkaleDKG.G2Point memory value) internal pure returns (bool result) {
        return value.x.a == 0 && value.x.b == 0 && value.y.a == 1 && value.y.b == 0;
        // return isG2ZeroPoint(value.x, value.y);
    }

    /**
     * @dev Checks are G2 points identical.
     * This function will return false if following coordinates
     * of points are different, even if its different on P.
     */
    function isEqual(
        ISkaleDKG.G2Point memory value1,
        ISkaleDKG.G2Point memory value2
    )
        internal
        pure
        returns (bool result)
    {
        return value1.x.isEqual(value2.x) && value1.y.isEqual(value2.y);
    }
}
