// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDkgResponse.sol - SKALE Manager
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
import "../Decryption.sol";
import "../Nodes.sol";
import "../thirdparty/ECDH.sol";
import "../utils/FieldOperations.sol";

/**
 * @title SkaleDkgResponse
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgResponse {
    using G2Operations for G2Operations.G2Point;

    function response(
        bytes32 schainId,
        uint fromNodeIndex,
        uint secretNumber,
        G2Operations.G2Point memory multipliedShare,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.Channel) storage channels,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints
    )
        external
    {
        uint index = SchainsInternal(contractManager.getContract("SchainsInternal"))
            .getNodeIndexInGroup(schainId, fromNodeIndex);
        require(index < channels[schainId].n, "Node is not in this group");
        require(complaints[schainId].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(complaints[schainId].isResponse, "Have not submitted pre-response data");
        uint badNode = _verifyDataAndSlash(
            schainId,
            secretNumber,
            multipliedShare,
            contractManager,
            complaints
         );
        SkaleDKG(contractManager.getContract("SkaleDKG")).setBadNode(schainId, badNode);
    }

    function _verifyDataAndSlash(
        bytes32 schainId,
        uint secretNumber,
        G2Operations.G2Point memory multipliedShare,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints
    )
        private
        returns (uint badNode)
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

        badNode = (
            _checkCorrectMultipliedShare(multipliedShare, secret) &&
            multipliedShare.isEqual(complaints[schainId].sumOfVerVec) ?
            complaints[schainId].fromNodeToComplaint :
            complaints[schainId].nodeToComplaint
        );
        SkaleDKG(contractManager.getContract("SkaleDKG")).finalizeSlashing(schainId, badNode);
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