// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDKGPreResponse.sol - SKALE Manager
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

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "../SkaleDKG.sol";
import "../Wallets.sol";
import "../utils/FieldOperations.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDKGPreResponse {
    using SafeMath for uint;
    using G2Operations for G2Operations.G2Point;

    function preResponse(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Operations.G2Point[] memory verificationVector,
        G2Operations.G2Point[] memory verificationVectorMult,
        SkaleDKG.KeyShare[] memory secretKeyContribution,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => mapping(uint => bytes32)) storage hashedData
    )
        external
    {
        uint gasTotal = gasleft();
        SkaleDKG skaleDKG = SkaleDKG(contractManager.getContract("SkaleDKG"));
        uint index = _preResponseCheck(
            schainId,
            fromNodeIndex,
            verificationVector,
            verificationVectorMult,
            secretKeyContribution,
            skaleDKG,
            complaints,
            hashedData
        );
        // (uint indexOnSchain, ) = skaleDKG.checkAndReturnIndexInGroup(schainId, fromNodeIndex, true);
        // require(complaints[schainId].nodeToComplaint == fromNodeIndex, "Not this Node");
        // require(!complaints[schainId].isResponse, "Already submitted pre response data");
        // require(
        //     hashedData[schainId][indexOnSchain] == skaleDKG.hashData(secretKeyContribution, verificationVector),
        //     "Broadcasted Data is not correct"
        // );
        // require(
        //     verificationVector.length == verificationVectorMult.length,
        //     "Incorrect length of multiplied verification vector"
        // );
        // (uint index, ) = skaleDKG.checkAndReturnIndexInGroup(schainId, complaints[schainId].fromNodeToComplaint, true);
        // require(
        //     _checkCorrectVectorMultiplication(index, verificationVector, verificationVectorMult),
        //     "Multiplied verification vector is incorrect"
        // ); 
        _processPreResponse(secretKeyContribution[index].share, schainId, verificationVectorMult, complaints);
        // complaints[schainId].keyShare = secretKeyContribution[index].share;
        // complaints[schainId].sumOfVerVec = _calculateSum(verificationVectorMult);
        // complaints[schainId].isResponse = true;
        Wallets(payable(contractManager.getContract("Wallets")))
        .refundGasBySchain(schainId, fromNodeIndex, gasTotal - gasleft(), true);
    }

    function _preResponseCheck(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Operations.G2Point[] memory verificationVector,
        G2Operations.G2Point[] memory verificationVectorMult,
        SkaleDKG.KeyShare[] memory secretKeyContribution,
        SkaleDKG skaleDKG,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => mapping(uint => bytes32)) storage hashedData
    )
        private
        view
        returns (uint index)
    {
        (uint indexOnSchain, ) = skaleDKG.checkAndReturnIndexInGroup(schainId, fromNodeIndex, true);
        require(complaints[schainId].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(!complaints[schainId].isResponse, "Already submitted pre response data");
        require(
            hashedData[schainId][indexOnSchain] == skaleDKG.hashData(secretKeyContribution, verificationVector),
            "Broadcasted Data is not correct"
        );
        require(
            verificationVector.length == verificationVectorMult.length,
            "Incorrect length of multiplied verification vector"
        );
        (index, ) = skaleDKG.checkAndReturnIndexInGroup(schainId, complaints[schainId].fromNodeToComplaint, true);
        require(
            _checkCorrectVectorMultiplication(index, verificationVector, verificationVectorMult),
            "Multiplied verification vector is incorrect"
        ); 
    }

    function _processPreResponse(
        bytes32 share,
        bytes32 schainId,
        G2Operations.G2Point[] memory verificationVectorMult,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints
    )
        private
    {
        complaints[schainId].keyShare = share;
        complaints[schainId].sumOfVerVec = _calculateSum(verificationVectorMult);
        complaints[schainId].isResponse = true;
    }

    function _calculateSum(G2Operations.G2Point[] memory verificationVectorMult)
        private
        view
        returns (G2Operations.G2Point memory)
    {
        G2Operations.G2Point memory value = G2Operations.getG2Zero();
        for (uint i = 0; i < verificationVectorMult.length; i++) {
            value = value.addG2(verificationVectorMult[i]);
        }
        return value;
    }

    function _checkCorrectVectorMultiplication(
        uint indexOnSchain,
        G2Operations.G2Point[] memory verificationVector,
        G2Operations.G2Point[] memory verificationVectorMult
    )
        private
        view
        returns (bool)
    {
        Fp2Operations.Fp2Point memory value = G1Operations.getG1Generator();
        Fp2Operations.Fp2Point memory tmp = G1Operations.getG1Generator();
        for (uint i = 0; i < verificationVector.length; i++) {
            (tmp.a, tmp.b) = Precompiled.bn256ScalarMul(value.a, value.b, indexOnSchain.add(1) ** i);
            if (!_checkPairing(tmp, verificationVector[i], verificationVectorMult[i])) {
                return false;
            }
        }
        return true;
    }

    function _checkPairing(
        Fp2Operations.Fp2Point memory g1Mul,
        G2Operations.G2Point memory verificationVector,
        G2Operations.G2Point memory verificationVectorMult
    )
        private
        view
        returns (bool)
    {
        require(G1Operations.checkRange(g1Mul), "g1Mul is not valid");
        g1Mul.b = G1Operations.negate(g1Mul.b);
        Fp2Operations.Fp2Point memory one = G1Operations.getG1Generator();
        return Precompiled.bn256Pairing(
            one.a, one.b,
            verificationVectorMult.x.b, verificationVectorMult.x.a,
            verificationVectorMult.y.b, verificationVectorMult.y.a,
            g1Mul.a, g1Mul.b,
            verificationVector.x.b, verificationVector.x.a,
            verificationVector.y.b, verificationVector.y.a
        );
    }

}