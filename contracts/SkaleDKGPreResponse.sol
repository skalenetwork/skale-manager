pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./SkaleDKG.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKGPreResponse is SkaleDKG {

    function preResponse(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Operations.G2Point[] calldata verificationVector,
        G2Operations.G2Point[] calldata verificationVectorMult,
        KeyShare[] calldata secretKeyContribution
    )
        external
        override
        correctGroup(schainId)
        onlyNodeOwner(fromNodeIndex)
    {
        uint gasTotal = gasleft();
        uint index = _preResponseCheck(
            schainId,
            fromNodeIndex,
            verificationVector,
            verificationVectorMult,
            secretKeyContribution
        );
        _processPreResponse(secretKeyContribution[index].share, schainId, verificationVectorMult);
        _refundGasBySchain(schainId, fromNodeIndex, gasTotal - gasleft());
    }

    function _preResponseCheck(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Operations.G2Point[] calldata verificationVector,
        G2Operations.G2Point[] calldata verificationVectorMult,
        KeyShare[] calldata secretKeyContribution
    )
        private
        view
        returns (uint index)
    {
        (uint indexOnSchain, ) = _checkAndReturnIndexInGroup(schainId, fromNodeIndex, true);
        require(complaints[schainId].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(!complaints[schainId].isResponse, "Already submitted pre response data");
        require(
            hashedData[schainId][indexOnSchain] == _hashData(secretKeyContribution, verificationVector),
            "Broadcasted Data is not correct"
        );
        require(
            verificationVector.length == verificationVectorMult.length,
            "Incorrect length of multiplied verification vector"
        );
        (index, ) = _checkAndReturnIndexInGroup(schainId, complaints[schainId].fromNodeToComplaint, true);
        require(
            _checkCorrectVectorMultiplication(index, verificationVector, verificationVectorMult),
            "Multiplied verification vector is incorrect"
        ); 
    }

    function _processPreResponse(
        bytes32 share,
        bytes32 schainId,
        G2Operations.G2Point[] calldata verificationVectorMult
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