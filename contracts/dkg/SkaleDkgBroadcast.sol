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

import {IConstantsHolder} from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import {IKeyStorage} from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import {INodeRotation} from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import {ISkaleDKG} from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import {GroupIndexIsInvalid} from "../CommonErrors.sol";

/**
 * @title SkaleDkgBroadcast
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgBroadcast {

    struct Contracts {
        IConstantsHolder constantsHolder;
        IKeyStorage keyStorage;
        INodeRotation nodeRotation;
        ISkaleDKG skaleDKG;
    }

    struct BroadcastParams {
        bytes32 schainHash;
        uint256 nodeIndex;
        uint256 rotationCounter;
        Contracts contracts;
    }

    error NodeIsAlreadyBroadcasted(bytes32 schainHash, uint256 nodeIndex);
    error IncorrectRotationCounter(uint256 actual, uint256 expected);
    error IncorrectNumberOfVerificationVectors(uint256 actual, uint256 expected);
    error IncorrectNumberOfSecretKeyShares(uint256 actual, uint256 expected);
    error IncorrectTimeForBroadcast(uint256 timelimit);
    error NodeShouldNotSendBroadcast(bytes32 schainHash, uint256 nodeIndex);

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
        BroadcastParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => ISkaleDKG.ProcessDKG) storage dkgProcess,
        mapping(bytes32 => mapping(uint256 => bytes32)) storage hashedData
    ) external {
        _verifyData({
            params: params,
            verificationVector: verificationVector,
            secretKeyContribution: secretKeyContribution,
            channels: channels
        });
        (uint256 index, bool valid) = params.contracts.skaleDKG.checkAndReturnIndexInGroup(
            params.schainHash,
            params.nodeIndex,
            true
        );
        require(valid, GroupIndexIsInvalid(index));
        require(
            !dkgProcess[params.schainHash].broadcasted[index],
            NodeIsAlreadyBroadcasted(params.schainHash, params.nodeIndex)
        );
        dkgProcess[params.schainHash].broadcasted[index] = true;
        ++dkgProcess[params.schainHash].numberOfBroadcasted;
        uint256 targetBroadcastNumber = getTargetBroadcastNumber(
            params.schainHash,
            params.contracts.nodeRotation,
            channels
        );
        if (dkgProcess[params.schainHash].numberOfBroadcasted == targetBroadcastNumber) {
            params.contracts.skaleDKG.setStartAlrightTimestamp(params.schainHash);
        }
        hashedData[params.schainHash][index] = params.contracts.skaleDKG.hashData(
            secretKeyContribution,
            verificationVector
        );
        params.contracts.keyStorage.adding(params.schainHash, verificationVector[0]);
        emit ISkaleDKG.BroadcastAndKeyShare(
            params.schainHash,
            params.nodeIndex,
            verificationVector,
            secretKeyContribution
        );
    }

    function getTargetBroadcastNumber(
        bytes32 schainHash,
        INodeRotation nodeRotation,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels
    )
        public
        view
        returns (uint256 targetBroadcastNumber)
    {
        uint256 n = channels[schainHash].n;
        if (nodeRotation.isSchainCreation(schainHash)) {
            return n;
        } else {
            return getT(n);
        }
    }

    function getT(uint256 n) public pure returns (uint256 t) {
        return (n * 2 + 1) / 3;
    }

    function _verifyData(
        BroadcastParams calldata params,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels
    )
    private
    view
    {
        uint256 n = channels[params.schainHash].n;
        uint256 currentRotationCounter =
            params.contracts.nodeRotation.getRotation(params.schainHash).rotationCounter;
        require(
            currentRotationCounter == params.rotationCounter,
            IncorrectRotationCounter(params.rotationCounter, currentRotationCounter)
        );
        require(
            verificationVector.length == getT(n),
            IncorrectNumberOfVerificationVectors(verificationVector.length, getT(n))
        );
        require(
            secretKeyContribution.length == n,
            IncorrectNumberOfSecretKeyShares(secretKeyContribution.length, n)
        );
        uint256 broadcastTimeLimit = channels[params.schainHash].startedBlockTimestamp +
                params.contracts.constantsHolder.complaintTimeLimit();
        require(
            block.timestamp < broadcastTimeLimit,
            IncorrectTimeForBroadcast(broadcastTimeLimit)
        );
        if (!params.contracts.nodeRotation.isSchainCreation(params.schainHash)) {
            require(
                params.contracts.nodeRotation.shouldSendBroadcast(
                    params.schainHash,
                    params.nodeIndex
                ),
                NodeShouldNotSendBroadcast(params.schainHash, params.nodeIndex)
            );
        }
    }
}
