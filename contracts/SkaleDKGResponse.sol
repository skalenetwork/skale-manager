pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./SkaleDKG.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKGResponse is SkaleDKG {

    function response(
        bytes32 schainId,
        uint fromNodeIndex,
        uint secretNumber,
        G2Operations.G2Point calldata multipliedShare
    )
        external
        override
        correctGroup(schainId)
        onlyNodeOwner(fromNodeIndex)
    {
        uint gasTotal = gasleft();
        _checkAndReturnIndexInGroup(schainId, fromNodeIndex, true);
        require(complaints[schainId].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(complaints[schainId].isResponse, "Have not submitted pre-response data");
        _verifyDataAndSlash(
            schainId,
            secretNumber,
            multipliedShare
         );
        _refundGasBySchain(gasTotal, schainId, fromNodeIndex);
    }

    function _verifyDataAndSlash(
        bytes32 schainId,
        uint secretNumber,
        G2Operations.G2Point calldata multipliedShare
    )
        internal
    {
        bytes32[2] memory publicKey = Nodes(contractManager.getContract("Nodes")).getNodePublicKey(
            complaints[schainId].fromNodeToComplaint
        );
        uint256 pkX = uint(publicKey[0]);

        (pkX, ) = ECDH(contractManager.getContract("ECDH")).deriveKey(secretNumber, pkX, uint(publicKey[1]));
        bytes32 key = bytes32(pkX);

        // Decrypt secret key contribution
        uint secret = Decryption(contractManager.getContract("Decryption")).decrypt(
            complaints[schainId].keyShare,
            sha256(abi.encodePacked(key))
        );

        uint badNode = (
            _checkCorrectMultipliedShare(multipliedShare, secret) &&
            multipliedShare.isEqual(complaints[schainId].sumOfVerVec) ?
            complaints[schainId].fromNodeToComplaint :
            complaints[schainId].nodeToComplaint
        );
        _finalizeSlashing(schainId, badNode);
    }

    function _checkCorrectMultipliedShare(
        G2Operations.G2Point memory multipliedShare,
        uint secret
    )
        private
        view
        returns (bool)
    {
        if (!multipliedShare.isG2()) {
            return false;
        }
        G2Operations.G2Point memory tmp = multipliedShare;
        Fp2Operations.Fp2Point memory g1 = G1Operations.getG1Generator();
        Fp2Operations.Fp2Point memory share = Fp2Operations.Fp2Point({
            a: 0,
            b: 0
        });
        (share.a, share.b) = Precompiled.bn256ScalarMul(g1.a, g1.b, secret);
        require(G1Operations.checkRange(share), "share is not valid");
        share.b = G1Operations.negate(share.b);

        require(G1Operations.isG1(share), "mulShare not in G1");

        G2Operations.G2Point memory g2 = G2Operations.getG2Generator();

        return Precompiled.bn256Pairing(
            share.a, share.b,
            g2.x.b, g2.x.a, g2.y.b, g2.y.a,
            g1.a, g1.b,
            tmp.x.b, tmp.x.a, tmp.y.b, tmp.y.a);
    }



}