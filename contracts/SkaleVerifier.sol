
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

pragma solidity ^0.5.0;


contract SkaleVerifier {


    uint p = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint g2a = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint g2b = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint g2c = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint g2d = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    function checkHashToGroupWithHelper(bytes32 hash, uint8 counter, uint hash_a, uint hash_b) internal view returns (bool) {
        uint x_coord = uint(hash) % p;
        x_coord = (x_coord + counter) % p;

        uint y_squared = (((((x_coord * x_coord) % p) * x_coord) % p) + 3) % p;

        if (hash_b < p / 2  || (hash_b * hash_b) % p != y_squared || x_coord != hash_a) {
            return false;
        }

        return true;
    }

    function verify(
        uint signa,
        uint _signb,
        bytes32 hash,
        uint8 counter,
        uint hasha,
        uint hashb,
        uint pkx1,
        uint pky1,
        uint pkx2,
        uint pky2) public view returns (bool)
    {
        if (!checkHashToGroupWithHelper(hash, counter, hasha, hashb)) {
            return false;
        }

        uint signb;
        if (!(signa == 0 && _signb == 0)) {
            signb = p - (_signb % p);
        } else {
            signb = _signb;
        }
        bool success;
        uint[12] memory inputToPairing;
        inputToPairing[0] = signa;
        inputToPairing[1] = signb;
        inputToPairing[2] = g2a;
        inputToPairing[3] = g2b;
        inputToPairing[4] = g2c;
        inputToPairing[5] = g2d;
        inputToPairing[6] = hasha;
        inputToPairing[7] = hashb;
        inputToPairing[8] = pkx1;
        inputToPairing[9] = pky1;
        inputToPairing[10] = pkx2;
        inputToPairing[11] = pky2;
        uint[1] memory out;
        assembly {
            success := staticcall(not(0), 8, inputToPairing, mul(12, 0x20), out, 0x20)
        }
        require(success, "Pairing check failed");
        return out[0] != 0;
    }
}
