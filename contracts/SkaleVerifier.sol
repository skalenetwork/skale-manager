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

pragma solidity 0.6.8;

import "./Permissions.sol";
import "./SchainsInternal.sol";
import "./utils/Precompiled.sol";
import "./utils/FieldOperations.sol";


contract SkaleVerifier is Permissions {  
    using Fp2Operations for Fp2Operations.Fp2Point;  

    uint constant private _G2A = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint constant private _G2B = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint constant private _G2C = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint constant private _G2D = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    function verifySchainSignature(
        uint signA,
        uint signB,
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB,
        string calldata schainName
    )
        external
        view
        returns (bool)
    {
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

        SchainsInternal schainsInternal = SchainsInternal(_contractManager.getContract("SchainsInternal"));
        (uint pkA, uint pkB, uint pkC, uint pkD) = schainsInternal.getGroupsPublicKey(
            keccak256(abi.encodePacked(schainName))
        );
        return verify(
            signA,
            signB,
            hash,
            counter,
            hashA,
            hashB,
            pkA,
            pkB,
            pkC,
            pkD
        );
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    function verify(
        uint signA,
        uint signB,
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB,
        uint pkA,
        uint pkB,
        uint pkC,
        uint pkD) public view returns (bool)
    {
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

        uint newSignB;
        if (!(signA == 0 && signB == 0)) {
            newSignB = Fp2Operations.P.sub((signB % Fp2Operations.P));
        } else {
            newSignB = signB;
        }

        require(G2Operations.isG1(signA, newSignB), "Sign not in G1");
        require(G2Operations.isG1(hashA, hashB), "Hash not in G1");

        require(
            G2Operations.isG2Point(
                Fp2Operations.Fp2Point({a: _G2A, b: _G2B}),
                Fp2Operations.Fp2Point({a: _G2C, b: _G2D})
            ),
            "G2.one not in G2"
        );
        require(
            G2Operations.isG2Point(
                Fp2Operations.Fp2Point({a: pkA, b: pkB}),
                Fp2Operations.Fp2Point({a: pkC, b: pkD})),
            "Public Key not in G2"
        );

        return Precompiled.bn256Pairing(signA, newSignB, _G2B, _G2A, _G2D, _G2C, hashA, hashB, pkB, pkA, pkD, pkC);
    }

    function _checkHashToGroupWithHelper(
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB
    )
        private
        pure
        returns (bool)
    {
        uint xCoord = uint(hash) % Fp2Operations.P;
        xCoord = (xCoord.add(counter)) % Fp2Operations.P;

        uint ySquared = addmod(
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
