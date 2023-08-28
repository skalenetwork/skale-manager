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

pragma solidity 0.8.17;

import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { IDecryption } from "@skalenetwork/skale-manager-interfaces/IDecryption.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";
import { IECDH } from "@skalenetwork/skale-manager-interfaces/thirdparty/IECDH.sol";
import { IContractManager } from "@skalenetwork/skale-manager-interfaces/IContractManager.sol";
import { IConstantsHolder } from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";

import { G1Operations, G2Operations } from "../utils/FieldOperations.sol";
import { Precompiled } from "../utils/Precompiled.sol";

/**
 * @title SkaleDkgResponse
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgResponse {
    using G2Operations for ISkaleDKG.G2Point;

    function response(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        uint256 secretNumber,
        ISkaleDKG.G2Point memory multipliedShare,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints
    )
        external
    {
        uint256 index = ISchainsInternal(contractManager.getContract("SchainsInternal"))
            .getNodeIndexInGroup(schainHash, fromNodeIndex);
        require(index < channels[schainHash].n, "Node is not in this group");
        require(complaints[schainHash].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(
            complaints[schainHash].startComplaintBlockTimestamp
                + _getComplaintTimeLimit(contractManager) > block.timestamp,
            "Incorrect time for response"
        );
        require(complaints[schainHash].isResponse, "Have not submitted pre-response data");
        uint256 badNode = _verifyDataAndSlash(
            schainHash,
            secretNumber,
            multipliedShare,
            contractManager,
            complaints
         );
        ISkaleDKG(contractManager.getContract("SkaleDKG")).setBadNode(schainHash, badNode);
    }

    function _verifyDataAndSlash(
        bytes32 schainHash,
        uint256 secretNumber,
        ISkaleDKG.G2Point memory multipliedShare,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints
    )
        private
        returns (uint256 badNode)
    {
        bytes32[2] memory publicKey = INodes(contractManager.getContract("Nodes")).getNodePublicKey(
            complaints[schainHash].fromNodeToComplaint
        );
        uint256 pkX = uint(publicKey[0]);

        (pkX, ) = IECDH(contractManager.getContract("ECDH")).deriveKey(secretNumber, pkX, uint(publicKey[1]));
        bytes32 key = bytes32(pkX);

        // Decrypt secret key contribution
        uint256 secret = IDecryption(contractManager.getContract("Decryption")).decrypt(
            complaints[schainHash].keyShare,
            sha256(abi.encodePacked(key))
        );

        badNode = (
            _checkCorrectMultipliedShare(multipliedShare, secret) &&
            multipliedShare.isEqual(complaints[schainHash].sumOfVerVec) ?
            complaints[schainHash].fromNodeToComplaint :
            complaints[schainHash].nodeToComplaint
        );
        ISkaleDKG(contractManager.getContract("SkaleDKG")).finalizeSlashing(schainHash, badNode);
    }

    function _checkCorrectMultipliedShare(
        ISkaleDKG.G2Point memory multipliedShare,
        uint256 secret
    )
        private
        view
        returns (bool correct)
    {
        if (!multipliedShare.isG2()) {
            return false;
        }
        ISkaleDKG.G2Point memory tmp = multipliedShare;
        ISkaleDKG.Fp2Point memory g1 = G1Operations.getG1Generator();
        ISkaleDKG.Fp2Point memory share = ISkaleDKG.Fp2Point({
            a: 0,
            b: 0
        });
        (share.a, share.b) = Precompiled.bn256ScalarMul(g1.a, g1.b, secret);
        require(G1Operations.checkRange(share), "share is not valid");
        share.b = G1Operations.negate(share.b);

        require(G1Operations.isG1(share), "mulShare not in G1");

        ISkaleDKG.G2Point memory g2 = G2Operations.getG2Generator();

        return Precompiled.bn256Pairing(
            share.a, share.b,
            g2.x.b, g2.x.a, g2.y.b, g2.y.a,
            g1.a, g1.b,
            tmp.x.b, tmp.x.a, tmp.y.b, tmp.y.a);
    }

    function _getComplaintTimeLimit(IContractManager contractManager) private view returns (uint256 timeLimit) {
        return IConstantsHolder(contractManager.getConstantsHolder()).complaintTimeLimit();
    }

}
