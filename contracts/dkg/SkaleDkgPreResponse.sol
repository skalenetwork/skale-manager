// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDkgPreResponse.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
    @author Dmytro Stebaiev
    @author Artem Payvin
    @author Vadim Yavorsky

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

pragma solidity 0.8.35;

import {ISkaleDKG} from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import {G1Operations} from "../utils/fieldOperations/G1Operations.sol";
import {G2Operations} from "../utils/fieldOperations/G2Operations.sol";
import {Precompiled} from "../utils/Precompiled.sol";

/**
 * @title SkaleDkgPreResponse
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgPreResponse {
    using G2Operations for ISkaleDKG.G2Point;

    struct PreResponseParams {
        bytes32 schainHash;
        uint256 fromNode;
        ISkaleDKG skaleDKG;
    }

    error WrongNode(uint256 node, uint256 expectedNode);
    error PreResponseWasAlreadySubmitted(bytes32 schainHash);
    error BroadcastedDataIsNotCorrect(bytes32 schainHash);
    error IncorrectLengthOfMultipliedVerificationVector(bytes32 schainHash);
    error MultipliedVerificationVectorIsNotCorrect(bytes32 schainHash);

    function preResponse(
        PreResponseParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => mapping(uint256 => bytes32)) storage hashedData
    ) external {
        uint256 index = _preResponseCheck({
            params: params,
            verificationVector: verificationVector,
            verificationVectorMultiplication: verificationVectorMultiplication,
            secretKeyContribution: secretKeyContribution,
            complaints: complaints,
            hashedData: hashedData
        });
        _processPreResponse(
            secretKeyContribution[index].share,
            params.schainHash,
            verificationVectorMultiplication,
            complaints
        );
    }

    function _processPreResponse(
        bytes32 share,
        bytes32 schainHash,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints
    ) private {
        complaints[schainHash].keyShare = share;
        complaints[schainHash].sumOfVerVec = _calculateSum(
            verificationVectorMultiplication
        );
        complaints[schainHash].isResponse = true;
    }

    function _preResponseCheck(
        PreResponseParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => mapping(uint256 => bytes32)) storage hashedData
    ) private view returns (uint256 index) {
        _checkFromNode(params, verificationVector, secretKeyContribution, hashedData);
        require(
            complaints[params.schainHash].nodeToComplaint == params.fromNode,
            WrongNode(params.fromNode, complaints[params.schainHash].nodeToComplaint)
        );
        require(
            !complaints[params.schainHash].isResponse,
            PreResponseWasAlreadySubmitted(params.schainHash)
        );
        require(
            verificationVector.length ==
                verificationVectorMultiplication.length,
            IncorrectLengthOfMultipliedVerificationVector(params.schainHash)
        );
        index = _checkToNode(
            params,
            verificationVector,
            verificationVectorMultiplication,
            complaints
        );
    }

    function _checkFromNode(
        PreResponseParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        mapping(bytes32 => mapping(uint256 => bytes32)) storage hashedData
    ) private view {
        (uint256 indexOnSchain, bool valid) = params.skaleDKG
            .checkAndReturnIndexInGroup(params.schainHash, params.fromNode, true);
        assert(valid);

        require(
            hashedData[params.schainHash][indexOnSchain] ==
                params.skaleDKG.hashData(secretKeyContribution, verificationVector),
            BroadcastedDataIsNotCorrect(params.schainHash)
        );
    }

    function _checkToNode(
        PreResponseParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints
    ) private view returns (uint256 indexInGroup) {
        bool valid;
        (indexInGroup, valid) = params.skaleDKG.checkAndReturnIndexInGroup(
            params.schainHash,
            complaints[params.schainHash].fromNodeToComplaint,
            true
        );
        assert(valid);
        require(
            _checkCorrectVectorMultiplication(
                indexInGroup,
                verificationVector,
                verificationVectorMultiplication
            ),
            MultipliedVerificationVectorIsNotCorrect(params.schainHash)
        );
    }

    function _calculateSum(
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication
    ) private view returns (ISkaleDKG.G2Point memory result) {
        ISkaleDKG.G2Point memory value = G2Operations.getG2Zero();
        uint256 length = verificationVectorMultiplication.length;
        for (uint256 i = 0; i < length; ++i) {
            value = value.addG2(verificationVectorMultiplication[i]);
        }
        return value;
    }

    function _checkCorrectVectorMultiplication(
        uint256 indexOnSchain,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication
    ) private view returns (bool correct) {
        ISkaleDKG.Fp2Point memory value = G1Operations.getG1Generator();
        ISkaleDKG.Fp2Point memory tmp = G1Operations.getG1Generator();
        uint256 length = verificationVector.length;
        for (uint256 i = 0; i < length; ++i) {
            (tmp.a, tmp.b) = Precompiled.bn256ScalarMul(
                value.a,
                value.b,
                (indexOnSchain + 1) ** i
            );
            if (
                !_checkPairing(
                    tmp,
                    verificationVector[i],
                    verificationVectorMultiplication[i]
                )
            ) {
                return false;
            }
        }
        return true;
    }

    function _checkPairing(
        ISkaleDKG.Fp2Point memory g1Mul,
        ISkaleDKG.G2Point calldata verificationVector,
        ISkaleDKG.G2Point calldata verificationVectorMultiplication
    ) private view returns (bool valid) {
        require(G1Operations.checkRange(g1Mul), "g1Mul is not valid");
        g1Mul.b = G1Operations.negate(g1Mul.b);
        ISkaleDKG.Fp2Point memory one = G1Operations.getG1Generator();
        return
            Precompiled.bn256Pairing({
                x1: one.a,
                y1: one.b,
                a1: verificationVectorMultiplication.x.b,
                b1: verificationVectorMultiplication.x.a,
                c1: verificationVectorMultiplication.y.b,
                d1: verificationVectorMultiplication.y.a,
                x2: g1Mul.a,
                y2: g1Mul.b,
                a2: verificationVector.x.b,
                b2: verificationVector.x.a,
                c2: verificationVector.y.b,
                d2: verificationVector.y.a
            });
    }
}
