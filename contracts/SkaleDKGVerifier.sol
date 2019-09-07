pragma solidity ^0.5.0;

contract SKALEDkgVerifier {
    uint p = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint g2a = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint g2b = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint g2c = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint g2d = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    struct Fp2 {
        uint x;
        uint y;
    }

    function addFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        return Fp2({ x: addmod(a.x, b.x, p), y: addmod(a.y, b.y, p) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint first;
        uint second;
        if (a.x >= b.x) {
            first = addmod(a.x, p - b.x, p);
        } else {
            first = p - addmod(b.x, p - a.x, p);
        }
        if (a.y >= b.y) {
            second = addmod(a.y, p - b.y, p);
        } else {
            second = p - addmod(b.y, p - a.y, p);
        }
        return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint aA = mulmod(a.x, b.x, p);
        uint bB = mulmod(a.y, b.y, p);
        return Fp2({
            x: addmod(aA, mulmod(p - 1, bB, p), p),
            y: addmod(mulmod(addmod(a.x, a.y, p), addmod(b.x, b.y, p), p), p - addmod(aA, bB, p), p)
        });
    }

    function squaredFp2(Fp2 memory a) internal view returns (Fp2 memory) {
        uint ab = mulmod(a.x, a.y, p);
        uint mult = mulmod(addmod(a.x, a.y, p), addmod(a.x, mulmod(p - 1, a.y, p), p), p);
        uint addition = addmod(ab, mulmod(p - 1, ab, p), p);
        return Fp2({ x: addmod(mult, p - addition, p), y: addmod(ab, ab, p) });
    }

    function doubleG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal view returns (Fp2 memory, Fp2 memory) {
        Fp2 memory A = squaredFp2(x1);
        Fp2 memory C = squaredFp2(squaredFp2(y1));
        Fp2 memory D = minusFp2(squaredFp2(addFp2(x1, squaredFp2(y1))), addFp2(A, C));
        D = addFp2(D, D);
        Fp2 memory E = addFp2(A, addFp2(A, A));
        Fp2 memory F = squaredFp2(E);
        Fp2 memory eightC = addFp2(C, C);
        eightC = addFp2(eightC, eightC);
        eightC = addFp2(eightC, eightC);
        Fp2 memory y1z1 = mulFp2(y1, z1);
        return toAffineCoordinatesG2(minusFp2(F, addFp2(D, D)), minusFp2(mulFp2(E, minusFp2(D, minusFp2(F, addFp2(D, D)))), eightC), addFp2(y1z1, y1z1));
    }

    function U1(Fp2 memory x1) internal view returns (Fp2 memory) {
        return mulFp2(x1, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function U2(Fp2 memory x2) internal view returns (Fp2 memory) {
        return mulFp2(x2, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function S1(Fp2 memory y1) internal view returns (Fp2 memory) {
        return mulFp2(y1, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function S2(Fp2 memory y2) internal view returns (Fp2 memory) {
        return mulFp2(y2, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function isEqual(Fp2 memory u1, Fp2 memory u2, Fp2 memory s1, Fp2 memory s2) internal pure returns (bool) {
        return (u1.x == u2.x && u1.y == u2.y && s1.x == s2.x && s1.y == s2.y);
    }

    function zForAddingG2(Fp2 memory u2, Fp2 memory u1) internal view returns (Fp2 memory) {
        Fp2 memory z = Fp2({ x: 1, y: 0 });
        Fp2 memory zz = squaredFp2(z);
        return mulFp2(minusFp2(squaredFp2(addFp2(z, z)), addFp2(zz, zz)), minusFp2(u2, u1));
    }

    function yForAddingG2(Fp2 memory s2, Fp2 memory s1, Fp2 memory u2, Fp2 memory u1, Fp2 memory x) internal view returns (Fp2 memory) {
        Fp2 memory r = addFp2(minusFp2(s2, s1), minusFp2(s2, s1));
        Fp2 memory I = squaredFp2(addFp2(minusFp2(u2, u1), minusFp2(u2, u1)));
        Fp2 memory V = mulFp2(u1, I);
        Fp2 memory J = mulFp2(minusFp2(u2, u1), I);
        return minusFp2(mulFp2(r, minusFp2(V, x)), addFp2(mulFp2(s1, J), mulFp2(s1, J)));
    }

    function xForAddingG2(Fp2 memory s2, Fp2 memory s1, Fp2 memory u2, Fp2 memory u1) internal view returns (Fp2 memory) {
        Fp2 memory r = addFp2(minusFp2(s2, s1), minusFp2(s2, s1));
        Fp2 memory I = squaredFp2(addFp2(minusFp2(u2, u1), minusFp2(u2, u1)));
        Fp2 memory V = mulFp2(u1, I);
        Fp2 memory J = mulFp2(minusFp2(u2, u1), I);
        return minusFp2(squaredFp2(r), addFp2(J, addFp2(V, V)));
    }

    function addG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory x2, Fp2 memory y2) internal view returns (Fp2 memory x, Fp2 memory y) {
        if (isEqual(U1(x1), U2(x2), S1(y1), S2(y2))) {
            return doubleG2(x1, y1, Fp2({ x: 1, y: 0 }));
        }
        Fp2 memory xForAdding = xForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1));
        return toAffineCoordinatesG2(xForAdding, yForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1), xForAdding), zForAddingG2(U2(x2), U1(x1)));
    }

    function mulG2(uint scalar, Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal view returns (Fp2 memory x, Fp2 memory y) {
        if (scalar % 2 == 0) {
            Fp2 memory temp_x;
            Fp2 memory temp_y;
            (temp_x, temp_y) = doubleG2(x1, y1, z1);
            (x, y) = mulG2(scalar / 2, temp_x, temp_y, Fp2(1, 0));
        } else {
            Fp2 memory temp_x;
            Fp2 memory temp_y;
            (temp_x, temp_y) = mulG2(scalar - 1, x1, y1, z1);
            (x, y) = addG2(x1, y1, temp_x, temp_y);
        }
    }

    function inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {
        uint t0 = mulmod(a.x, a.x, p);
        uint t1 = mulmod(a.y, a.y, p);
        uint t2 = mulmod(p - 1, t1, p);
        if (t0 >= t2) {
            t2 = addmod(t0, p - t2, p);
        } else {
            t2 = p - addmod(t2, p - t0, p);
        }
        uint[6] memory inputToBigModExp;
        inputToBigModExp[0] = 32;
        inputToBigModExp[1] = 32;
        inputToBigModExp[2] = 32;
        inputToBigModExp[3] = t2;
        inputToBigModExp[4] = p - 2;
        inputToBigModExp[5] = p;
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(not(0), 5, inputToBigModExp, mul(6, 0x20), out, 0x20)
        }
        require(success, "BigModExp failed");
        x.x = mulmod(a.x, out[0], p);
        x.y = p - mulmod(a.y, out[0], p);
    }

    function toAffineCoordinatesG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal view returns (Fp2 memory x, Fp2 memory y) {
        if (z1.x == 0 && z1.y == 0) {
            x.x = 0;
            x.y = 0;
            y.x = 1;
            y.y = 0;
        } else {
            Fp2 memory Z_inv = inverseFp2(z1);
            Fp2 memory Z2_inv = squaredFp2(Z_inv);
            Fp2 memory Z3_inv = mulFp2(Z2_inv, Z_inv);
            x = mulFp2(x1, Z2_inv);
            y = mulFp2(y1, Z3_inv);
        }
    }

    function bigModExp(uint8 index, uint8 loop_index) internal view returns (uint) {
        uint[6] memory inputToBigModExp;
        inputToBigModExp[0] = 8;
        inputToBigModExp[1] = 8;
        inputToBigModExp[2] = 32;
        inputToBigModExp[3] = index + 1;
        inputToBigModExp[4] = loop_index;
        inputToBigModExp[5] = p;
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(not(0), 5, inputToBigModExp, mul(6, 0x20), out, 0x20)
        }
        require(success, "BigModExp failed");
        return out[0];
    }

    function loop(uint8 index, bytes memory verificationVector, uint8 loop_index) internal view returns (Fp2 memory, Fp2 memory) {
        bytes32[6] memory vector;
        bytes32 vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(32, mul(loop_index, 192))))
        }
        vector[0] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(64, mul(loop_index, 192))))
        }
        vector[1] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(96, mul(loop_index, 192))))
        }
        vector[2] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(128, mul(loop_index, 192))))
        }
        vector[3] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(160, mul(loop_index, 192))))
        }
        vector[4] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(192, mul(loop_index, 192))))
        }
        vector[5] = vector1;
        return mulG2(bigModExp(index, loop_index), Fp2(uint(vector[0]), uint(vector[1])), Fp2(uint(vector[2]), uint(vector[3])), Fp2(uint(vector[4]), uint(vector[5])));
    }

    function checkVerifyAndMul(Fp2 memory val_x, Fp2 memory val_y, uint32 share) internal view returns (bool) {
        Fp2 memory tmp_x = Fp2(g2a, g2b);
        Fp2 memory tmp_y = Fp2(g2c, g2d);
        Fp2 memory p_z = Fp2(1, 0);
        (tmp_x, tmp_y) = mulG2(share, tmp_x, tmp_y, p_z);
        return val_x.x == tmp_x.x && val_x.y == tmp_x.y && val_y.x == tmp_y.x && val_y.y == tmp_y.y;
    }

    function addG2WithLoop(uint8 index, bytes memory verificationVector, uint8 i, Fp2 memory val_x, Fp2 memory val_y) internal view returns (Fp2 memory, Fp2 memory) {
        Fp2 memory x1;
        Fp2 memory y1;
        (x1, y1) = loop(index, verificationVector, i);
         return addG2(x1, y1, val_x, val_y);
    }

    function verify(uint8 index, uint32 share, bytes memory verificationVector) public view returns (bool) {
        Fp2 memory val_x;
        Fp2 memory val_y;
        for (uint8 i = 0; i < verificationVector.length / 1152; ++i) {
            (val_x, val_y) = addG2WithLoop(index, verificationVector, i, val_x, val_y);
        }
        return checkVerifyAndMul(val_x, val_y, share);
    }
}
