// SPDX-License-Identifier: AGPL-3.0-only

/*
    FractionUtils.sol - SKALE Manager
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


library FractionUtils {

    struct Fraction {
        uint256 numerator;
        uint256 denominator;
    }

    function createFraction(
        uint256 numerator,
        uint256 denominator
    )
        internal
        pure
        returns (Fraction memory fraction)
    {
        require(denominator > 0, "Division by zero");
        fraction = Fraction({numerator: numerator, denominator: denominator});
        reduceFraction(fraction);
        return fraction;
    }

    function createFraction(uint256 value) internal pure returns (Fraction memory fraction) {
        return createFraction(value, 1);
    }

    function reduceFraction(Fraction memory fraction) internal pure {
        uint256 _gcd = gcd(fraction.numerator, fraction.denominator);
        fraction.numerator = fraction.numerator / _gcd;
        fraction.denominator = fraction.denominator / _gcd;
    }

    // numerator - is limited by 7*10^27,
    // we could multiply it numerator * numerator - it would less than 2^256-1
    function multiplyFraction(
        Fraction memory a,
        Fraction memory b
    )
        internal
        pure
        returns (Fraction memory fraction)
    {
        return createFraction(a.numerator * b.numerator, a.denominator * b.denominator);
    }

    function gcd(uint256 a, uint256 b) internal pure returns (uint256 value) {
        uint256 _a = a;
        uint256 _b = b;
        if (_b > _a) {
            (_a, _b) = swap(_a, _b);
        }
        while (_b > 0) {
            _a = _a % _b;
            (_a, _b) = swap (_a, _b);
        }
        return _a;
    }

    function swap(uint256 a, uint256 b) internal pure returns (uint256 left, uint256 right) {
        return (b, a);
    }
}
