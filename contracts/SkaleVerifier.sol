// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleVerifier.sol - SKALE Manager
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

pragma solidity 0.8.17;

import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { ISkaleVerifier } from "@skalenetwork/skale-manager-interfaces/ISkaleVerifier.sol";

import { Permissions } from "./Permissions.sol";
import { Precompiled } from "./utils/Precompiled.sol";
import { Fp2Operations } from "./utils/fieldOperations/Fp2Operations.sol";
import { G1Operations } from "./utils/fieldOperations/G1Operations.sol";
import { G2Operations } from "./utils/fieldOperations/G2Operations.sol";

/**
 * @title SkaleVerifier
 * @dev Contains verify function to perform BLS signature verification.
 */
contract SkaleVerifier is Permissions, ISkaleVerifier {
    using Fp2Operations for ISkaleDKG.Fp2Point;
    using G2Operations for ISkaleDKG.G2Point;

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
    * @dev Verifies a BLS signature.
    *
    * Requirements:
    *
    * - Signature is in G1.
    * - Hash is in G1.
    * - G2.one in G2.
    * - Public Key in G2.
    */
    function verify(
        ISkaleDKG.Fp2Point calldata signature,
        bytes32 hash,
        uint256 counter,
        uint256 hashA,
        uint256 hashB,
        ISkaleDKG.G2Point calldata publicKey
    )
        external
        view
        override
        returns (bool valid)
    {
        require(G1Operations.checkRange(signature), "Signature is not valid");
        if (!_checkHashToGroupWithHelper(
            hash,
            counter,
            hashA,
            hashB
            )
        )
        {
            return false;
        }

        uint256 newSignB = G1Operations.negate(signature.b);
        require(G1Operations.isG1Point(signature.a, newSignB), "Sign not in G1");
        require(G1Operations.isG1Point(hashA, hashB), "Hash not in G1");

        ISkaleDKG.G2Point memory g2 = G2Operations.getG2Generator();
        require(
            G2Operations.isG2(publicKey),
            "Public Key not in G2"
        );

        return Precompiled.bn256Pairing({
            x1: signature.a,
            y1: newSignB,
            a1: g2.x.b,
            b1: g2.x.a,
            c1: g2.y.b,
            d1: g2.y.a,
            x2: hashA,
            y2: hashB,
            a2: publicKey.x.b,
            b2: publicKey.x.a,
            c2: publicKey.y.b,
            d2: publicKey.y.a
        });
    }

    function _checkHashToGroupWithHelper(
        bytes32 hash,
        uint256 counter,
        uint256 hashA,
        uint256 hashB
    )
        private
        pure
        returns (bool valid)
    {
        if (counter > 100) {
            return false;
        }
        uint256 xCoord = uint256(hash) % Fp2Operations.P;
        xCoord = (xCoord + counter) % Fp2Operations.P;

        uint256 ySquared = addmod(
            mulmod(mulmod(xCoord, xCoord, Fp2Operations.P), xCoord, Fp2Operations.P),
            3,
            Fp2Operations.P
        );
        if (hashB < Fp2Operations.P / 2 || mulmod(hashB, hashB, Fp2Operations.P) != ySquared || xCoord != hashA) {
            return false;
        }

        return true;
    }
}
