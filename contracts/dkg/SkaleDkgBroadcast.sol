// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDkgBroadcast.sol - SKALE Manager
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
import {IKeyStorage} from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import {IContractManager} from "@skalenetwork/skale-manager-interfaces/IContractManager.sol";
import {IConstantsHolder} from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import {INodeRotation} from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";

import {GroupIndexIsInvalid} from "../CommonErrors.sol";

/**
 * @title SkaleDkgBroadcast
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgBroadcast {
    /**
     * @dev Emitted when a node broadcasts key share.
     */
    event BroadcastAndKeyShare(
        bytes32 indexed schainHash,
        uint256 indexed fromNode,
        ISkaleDKG.G2Point[] verificationVector,
        ISkaleDKG.KeyShare[] secretKeyContribution
    );

    error NodeIsAlreadyBroadcasted(bytes32 schainHash, uint256 nodeIndex);
    error IncorrectRotationCounter(uint256 actual, uint256 expected);
    error IncorrectNumberOfVerificationVectors(uint256 actual, uint256 expected);
    error IncorrectNumberOfSecretKeyShares(uint256 actual, uint256 expected);
    error IncorrectTimeForBroadcast(uint256 timelimit);

    /**
     * @dev Broadcasts verification vector and secret key contribution to all
     * other nodes in the group.
     *
     * Emits BroadcastAndKeyShare event.
     *
     * Requirements:
     *
     * - `msg.sender` must have an associated node.
     * - `verificationVector` must be a certain length.
     * - `secretKeyContribution` length must be equal to number of nodes in group.
     */
    function broadcast(
        bytes32 schainHash,
        uint256 nodeIndex,
        ISkaleDKG.G2Point[] memory verificationVector,
        ISkaleDKG.KeyShare[] memory secretKeyContribution,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => ISkaleDKG.ProcessDKG) storage dkgProcess,
        mapping(bytes32 => mapping(uint256 => bytes32)) storage hashedData,
        uint256 rotationCounter
    ) external {
        _verifyData({
            schainHash: schainHash,
            rotationCounter: rotationCounter,
            verificationVector: verificationVector,
            secretKeyContribution: secretKeyContribution,
            contractManager: contractManager,
            channels: channels
        });
        (uint256 index, bool valid) = ISkaleDKG(
            contractManager.getContract("SkaleDKG")
        ).checkAndReturnIndexInGroup(schainHash, nodeIndex, true);
        require(valid, GroupIndexIsInvalid(index));
        require(
            !dkgProcess[schainHash].broadcasted[index],
            NodeIsAlreadyBroadcasted(schainHash, nodeIndex)
        );
        dkgProcess[schainHash].broadcasted[index] = true;
        dkgProcess[schainHash].numberOfBroadcasted++;
        if ( dkgProcess[schainHash].numberOfBroadcasted == channels[schainHash].n ) {
            ISkaleDKG(contractManager.getContract("SkaleDKG"))
                .setStartAlrightTimestamp(schainHash);
        }
        hashedData[schainHash][index] = ISkaleDKG(
            contractManager.getContract("SkaleDKG")
        ).hashData(secretKeyContribution, verificationVector);
        IKeyStorage(contractManager.getContract("KeyStorage")).adding(
            schainHash,
            verificationVector[0]
        );
        emit BroadcastAndKeyShare(
            schainHash,
            nodeIndex,
            verificationVector,
            secretKeyContribution
        );
    }

    function getT(uint256 n) public pure returns (uint256 t) {
        return (n * 2 + 1) / 3;
    }

    function _verifyData(
        bytes32 schainHash,
        uint256 rotationCounter,
        ISkaleDKG.G2Point[] memory verificationVector,
        ISkaleDKG.KeyShare[] memory secretKeyContribution,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels
    )
    private
    view
    {
        uint256 n = channels[schainHash].n;
        uint256 currentRotationCounter = INodeRotation(
            contractManager.getContract("NodeRotation")
        ).getRotation(schainHash).rotationCounter;
        require(
            currentRotationCounter == rotationCounter,
            IncorrectRotationCounter(rotationCounter, currentRotationCounter)
        );
        require(
            verificationVector.length == getT(n),
            IncorrectNumberOfVerificationVectors(verificationVector.length, getT(n))
        );
        require(
            secretKeyContribution.length == n,
            IncorrectNumberOfSecretKeyShares(secretKeyContribution.length, n)
        );
        uint256 broadcastTimeLimit = channels[schainHash].startedBlockTimestamp +
                _getComplaintTimeLimit(contractManager);
        require(
            block.timestamp < broadcastTimeLimit,
            IncorrectTimeForBroadcast(broadcastTimeLimit)
        );
    }

    function _getComplaintTimeLimit(
        IContractManager contractManager
    ) private view returns (uint256 timeLimit) {
        return
            IConstantsHolder(contractManager.getConstantsHolder())
                .complaintTimeLimit();
    }
}
