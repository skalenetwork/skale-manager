// SPDX-License-Identifier: AGPL-3.0-only

/*
    SegmentTree.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
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

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/**
 * @title Random
 * @dev The library for generating of pseudo random numbers
 */
library Random {
    using SafeMath for uint;

    struct RandomGenerator {
        uint seed;
    }

    /**
     * @dev Create an instance of RandomGenerator
     */
    function create(uint seed) internal pure returns (RandomGenerator memory) {
        return RandomGenerator({seed: seed});
    }

    function createFromEntropy(bytes memory entropy) internal pure returns (RandomGenerator memory) {
        return create(uint(keccak256(entropy)));
    }

    /**
     * @dev Generates random value
     */
    function random(RandomGenerator memory self) internal pure returns (uint) {
        self.seed = uint(sha256(abi.encodePacked(self.seed)));
        return self.seed;
    }

    /**
     * @dev Generates random value in range [0, max)
     */
    function random(RandomGenerator memory self, uint max) internal pure returns (uint) {
        assert(max > 0);
        uint maxRand = uint(-1).div(max).mul(max);
        if (uint(-1).sub(maxRand) == max.sub(1)) {
            return random(self).mod(max);
        } else {
            uint rand = random(self);
            while (rand >= maxRand) {
                rand = random(self);
            }
            return rand.mod(max);
        }
    }

    /**
     * @dev Generates random value in range [min, max)
     */
    function random(RandomGenerator memory self, uint min, uint max) internal pure returns (uint) {
        assert(min < max);
        return min.add(random(self, max.sub(min)));
    }
}