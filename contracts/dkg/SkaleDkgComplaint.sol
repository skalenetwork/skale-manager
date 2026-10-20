// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDkgComplaint.sol - SKALE Manager
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
import {IConstantsHolder} from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import {IContractManager} from "@skalenetwork/skale-manager-interfaces/IContractManager.sol";

/**
 * @title SkaleDkgComplaint
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgComplaint {
    /**
     * @dev Emitted when a complaint is sent.
     */
    event ComplaintSent(
        bytes32 indexed schainHash,
        uint256 indexed fromNodeIndex,
        uint256 indexed toNodeIndex
    );

    error NodeHasNotBroadcasted(bytes32 schainHash, uint256 nodeIndex);
    error NodeHasSentAlright(bytes32 schainHash, uint256 nodeIndex);
    error FirstComplaintHasAlreadyBeenProcessed(bytes32 schainHash);
    error SameComplaintRejected(bytes32 schainHash, uint256 timeout);
    error ComplaintIsAlreadySent(bytes32 schainHash, uint256 nodeIndex);
    error ComplaintSentTooEarly(bytes32 schainHash, uint256 timeout);

    /**
     * @dev Creates a complaint from a node (accuser) to a given node.
     * The accusing node must broadcast additional parameters within 1800 blocks.
     *
     * Emits {ComplaintSent} event.
     *
     * Requirements:
     *
     * - `msg.sender` must have an associated node.
     */
    function complaint(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        uint256 toNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => uint256) storage startAlrightTimestamp
    ) external {
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        require(
            skaleDKG.isNodeBroadcasted(schainHash, fromNodeIndex),
            NodeHasNotBroadcasted(schainHash, fromNodeIndex)
        );
        if (skaleDKG.isNodeBroadcasted(schainHash, toNodeIndex)) {
            _handleComplaintWhenBroadcasted({
                schainHash: schainHash,
                fromNodeIndex: fromNodeIndex,
                toNodeIndex: toNodeIndex,
                contractManager: contractManager,
                complaints: complaints,
                startAlrightTimestamp: startAlrightTimestamp
            });
        } else {
            // not broadcasted in 30 min
            _handleComplaintWhenNotBroadcasted(
                schainHash,
                toNodeIndex,
                contractManager,
                channels
            );
        }
    }

    function complaintBadData(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        uint256 toNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints
    ) external {
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        require(
            skaleDKG.isNodeBroadcasted(schainHash, fromNodeIndex),
            NodeHasNotBroadcasted(schainHash, fromNodeIndex)
        );
        require(
            skaleDKG.isNodeBroadcasted(schainHash, toNodeIndex),
            NodeHasNotBroadcasted(schainHash, toNodeIndex)
        );
        require(
            !skaleDKG.isAllDataReceived(schainHash, fromNodeIndex),
            NodeHasSentAlright(schainHash, fromNodeIndex)
        );
        require(
            complaints[schainHash].nodeToComplaint == type(uint256).max,
            FirstComplaintHasAlreadyBeenProcessed(schainHash)
        );
        complaints[schainHash].nodeToComplaint = toNodeIndex;
        complaints[schainHash].fromNodeToComplaint = fromNodeIndex;
        complaints[schainHash].startComplaintBlockTimestamp = block
            .timestamp;
        emit ComplaintSent(schainHash, fromNodeIndex, toNodeIndex);
    }

    function _handleComplaintWhenBroadcasted(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        uint256 toNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => uint256) storage startAlrightTimestamp
    ) private {
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        // missing alright
        if (complaints[schainHash].nodeToComplaint == type(uint256).max) {
            if (
                skaleDKG.isEveryoneBroadcasted(schainHash) &&
                !skaleDKG.isAllDataReceived(schainHash, toNodeIndex) &&
                startAlrightTimestamp[schainHash] +
                    _getComplaintTimeLimit(contractManager) <=
                block.timestamp
            ) {
                // missing alright
                skaleDKG.finalizeSlashing(schainHash, toNodeIndex);
                return;
            }
            // incorrect data
            require(
                !skaleDKG.isAllDataReceived(schainHash, fromNodeIndex),
                NodeHasSentAlright(schainHash, fromNodeIndex)
            );
            skaleDKG.finalizeSlashing(schainHash, fromNodeIndex);
            return;
        }
        require(
            complaints[schainHash].nodeToComplaint == toNodeIndex,
            ComplaintIsAlreadySent(schainHash, complaints[schainHash].nodeToComplaint)
        );
        // 30 min after incorrect data complaint
        require(
            complaints[schainHash].startComplaintBlockTimestamp +
                _getComplaintTimeLimit(contractManager) <=
            block.timestamp,
            SameComplaintRejected(
                schainHash,
                complaints[schainHash].startComplaintBlockTimestamp +
                    _getComplaintTimeLimit(contractManager)
            )
        );
        skaleDKG.finalizeSlashing(
            schainHash,
            complaints[schainHash].nodeToComplaint
        );
    }

    function _handleComplaintWhenNotBroadcasted(
        bytes32 schainHash,
        uint256 toNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels
    ) private {
        require(
            channels[schainHash].startedBlockTimestamp +
                _getComplaintTimeLimit(contractManager) <=
            block.timestamp,
            ComplaintSentTooEarly(
                schainHash,
                channels[schainHash].startedBlockTimestamp +
                    _getComplaintTimeLimit(contractManager)
            )
        );
        ISkaleDKG(contractManager.getContract("SkaleDKG")).finalizeSlashing(
                schainHash,
                toNodeIndex
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
