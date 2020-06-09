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
import "./interfaces/IGroupsData.sol";
import "./utils/Precompiled.sol";


contract SkaleVerifier is Permissions {


    uint constant private _P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint constant private _G2A = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint constant private _G2B = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint constant private _G2C = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint constant private _G2D = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    uint constant private _TWISTBX = 19485874751759354771024239261021720505790618469301721065564631296452457478373;
    uint constant private _TWISTBY = 266929791119991161246907387137283842545076965332900288569378510910307636690;

    struct Fp2 {
        uint x;
        uint y;
    }

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

        address schainsDataAddress = _contractManager.getContract("SchainsData");
        (uint pkA, uint pkB, uint pkC, uint pkD) = IGroupsData(schainsDataAddress).getGroupsPublicKey(
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
            newSignB = _P.sub((signB % _P));
        } else {
            newSignB = signB;
        }

        require(_isG1(signA, newSignB), "Sign not in G1");
        require(_isG1(hashA, hashB), "Hash not in G1");

        require(_isG2(Fp2({x: _G2A, y: _G2B}), Fp2({x: _G2C, y: _G2D})), "G2.one not in G2");
        require(_isG2(Fp2({x: pkA, y: pkB}), Fp2({x: pkC, y: pkD})), "Public Key not in G2");

        return Precompiled.bn256Pairing(
            signA,
            newSignB,
            _G2B,
            _G2A,
            _G2D,
            _G2C,
            hashA,
            hashB,
            pkB,
            pkA,
            pkD,
            pkC);
    }

    function _checkHashToGroupWithHelper(
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB
    )
        internal
        pure
        returns (bool)
    {
        uint xCoord = uint(hash) % _P;
        xCoord = (xCoord.add(counter)) % _P;

        uint ySquared = addmod(mulmod(mulmod(xCoord, xCoord, _P), xCoord, _P), 3, _P);
        if (hashB < _P / 2 || mulmod(hashB, hashB, _P) != ySquared || xCoord != hashA) {
            return false;
        }

        return true;
    }

    // Fp2 operations

    function _addFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        return Fp2({ x: addmod(a.x, b.x, _P), y: addmod(a.y, b.y, _P) });
    }

    function _scalarMulFp2(uint scalar, Fp2 memory a) internal pure returns (Fp2 memory) {
        return Fp2({ x: mulmod(scalar, a.x, _P), y: mulmod(scalar, a.y, _P) });
    }

    function _minusFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint first;
        uint second;
        if (a.x >= b.x) {
            first = addmod(a.x, _P.sub(b.x), _P);
        } else {
            first = _P.sub(addmod(b.x, _P.sub(a.x), _P));
        }
        if (a.y >= b.y) {
            second = addmod(a.y, _P.sub(b.y), _P);
        } else {
            second = _P.sub(addmod(b.y, _P.sub(a.y), _P));
        }
        return Fp2({ x: first, y: second });
    }

    function _mulFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint aA = mulmod(a.x, b.x, _P);
        uint bB = mulmod(a.y, b.y, _P);
        return Fp2({
            x: addmod(aA, mulmod(_P - 1, bB, _P), _P),
            y: addmod(mulmod(addmod(a.x, a.y, _P), addmod(b.x, b.y, _P), _P), _P.sub(addmod(aA, bB, _P)), _P)
        });
    }

    function _squaredFp2(Fp2 memory a) internal pure returns (Fp2 memory) {
        uint ab = mulmod(a.x, a.y, _P);
        uint mult = mulmod(addmod(a.x, a.y, _P), addmod(a.x, mulmod(_P - 1, a.y, _P), _P), _P);
        return Fp2({ x: mult, y: addmod(ab, ab, _P) });
    }

    function _inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {
        uint t0 = mulmod(a.x, a.x, _P);
        uint t1 = mulmod(a.y, a.y, _P);
        uint t2 = mulmod(_P - 1, t1, _P);
        if (t0 >= t2) {
            t2 = addmod(t0, _P.sub(t2), _P);
        } else {
            t2 = _P.sub(addmod(t2, _P.sub(t0), _P));
        }
        uint t3 = Precompiled.bigModExp(t2, _P - 2, _P);
        x.x = mulmod(a.x, t3, _P);
        x.y = _P.sub(mulmod(a.y, t3, _P));
    }

    // End of Fp2 operations

    function _isG1(uint x, uint y) internal pure returns (bool) {
        return mulmod(y, y, _P) == addmod(mulmod(mulmod(x, x, _P), x, _P), 3, _P);
    }

    function _isG2(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {
        if (_isG2Zero(x, y)) {
            return true;
        }
        Fp2 memory squaredY = _squaredFp2(y);
        Fp2 memory res = _minusFp2(_minusFp2(squaredY, _mulFp2(_squaredFp2(x), x)), Fp2({x: _TWISTBX, y: _TWISTBY}));
        return res.x == 0 && res.y == 0;
    }

    function _isG2Zero(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {
        return x.x == 0 && x.y == 0 && y.x == 1 && y.y == 0;
    }
}
