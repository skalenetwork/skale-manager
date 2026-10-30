// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDkgAlright.sol - SKALE Manager
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
import {IContractManager} from "@skalenetwork/skale-manager-interfaces/IContractManager.sol";
import {IKeyStorage} from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import {INodeRotation} from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import {ISkaleDKG} from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import {GroupIndexIsInvalid} from "../CommonErrors.sol";

/**
 * @title SkaleDkgAlright
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgAlright {

    error BroadcastingPhaseIsNotOver(bytes32 schainHash);
    error IncorrectTimeForAlright(bytes32 schainHash, uint256 timeout);
    error ComplaintWasSent(bytes32 schainHash, uint256 nodeIndex);
    error AlrightWasSent(bytes32 schainHash, uint256 nodeIndex);

    function alright(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => ISkaleDKG.ProcessDKG) storage dkgProcess,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => uint256) storage lastSuccessfulDKG,
        mapping(bytes32 => uint256) storage startAlrightTimestamp
    ) external {
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        (uint256 index, bool valid) = skaleDKG.checkAndReturnIndexInGroup(
            schainHash,
            fromNodeIndex,
            true
        );
        require(valid, GroupIndexIsInvalid(index));
        require(
            dkgProcess[schainHash].numberOfBroadcasted == skaleDKG.getTargetBroadcastNumber(
                schainHash
            ),
            BroadcastingPhaseIsNotOver(schainHash)
        );
        require(
            startAlrightTimestamp[schainHash] +
                _getComplaintTimeLimit(contractManager) >
                block.timestamp,
            IncorrectTimeForAlright(
                schainHash,
                startAlrightTimestamp[schainHash] + _getComplaintTimeLimit(contractManager)
            )
        );
        require(
            complaints[schainHash].fromNodeToComplaint != fromNodeIndex ||
                (fromNodeIndex == 0 &&
                    complaints[schainHash].startComplaintBlockTimestamp == 0),
            ComplaintWasSent(schainHash, fromNodeIndex)
        );
        require(
            !dkgProcess[schainHash].completed[index],
            AlrightWasSent(schainHash, fromNodeIndex)
        );
        dkgProcess[schainHash].completed[index] = true;
        ++dkgProcess[schainHash].numberOfCompleted;
        emit ISkaleDKG.AllDataReceived(schainHash, fromNodeIndex);
        if (dkgProcess[schainHash].numberOfCompleted == channels[schainHash].n) {
            _finalizeDKG(schainHash, contractManager, channels, lastSuccessfulDKG);
        }
    }

    function _finalizeDKG(
        bytes32 schainHash,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => uint256) storage lastSuccessfulDKG
    ) private {
        lastSuccessfulDKG[schainHash] = block.timestamp;
        channels[schainHash].active = false;
        emit ISkaleDKG.SuccessfulDKG(schainHash);
        IKeyStorage(contractManager.getContract("KeyStorage"))
            .finalizePublicKey(schainHash);
        INodeRotation(contractManager.getContract("NodeRotation")).finalizeRotation(schainHash);
    }

    function _getComplaintTimeLimit(
        IContractManager contractManager
    ) private view returns (uint256 timeLimit) {
        return
            IConstantsHolder(contractManager.getConstantsHolder())
                .complaintTimeLimit();
    }
}
