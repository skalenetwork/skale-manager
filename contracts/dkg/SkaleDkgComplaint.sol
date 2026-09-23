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

pragma solidity 0.8.30;

import {ISkaleDKG} from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import {IConstantsHolder} from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import {IContractManager} from "@skalenetwork/skale-manager-interfaces/IContractManager.sol";

import {NodeHasAlreadySentAlright} from "./DkgErrors.sol";

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

    error NodeHasNotBroadcasted(uint256 nodeIndex);
    error ComplaintIsAlreadyPending(uint256 accusedNode);
    error ComplaintSentTooEarly(bytes32 schainHash);

    /**
     * @dev Creates a complaint from a node (accuser) to a given node.
     * The accusing node must broadcast additional parameters within 1800 blocks.
     * Reverts unless the complaint results in slashing, so rejected complaints are never refunded.
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
            NodeHasNotBroadcasted(fromNodeIndex)
        );
        uint256 badNode;
        if (skaleDKG.isNodeBroadcasted(schainHash, toNodeIndex)) {
            badNode = _handleComplaintWhenBroadcasted({
                schainHash: schainHash,
                fromNodeIndex: fromNodeIndex,
                toNodeIndex: toNodeIndex,
                contractManager: contractManager,
                complaints: complaints,
                startAlrightTimestamp: startAlrightTimestamp
            });
        } else {
            // not broadcasted in 30 min
            badNode = _handleComplaintWhenNotBroadcasted(
                schainHash,
                toNodeIndex,
                contractManager,
                channels
            );
        }
        skaleDKG.setBadNode(schainHash, badNode);
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
            NodeHasNotBroadcasted(fromNodeIndex)
        );
        require(
            skaleDKG.isNodeBroadcasted(schainHash, toNodeIndex),
            NodeHasNotBroadcasted(toNodeIndex)
        );
        require(
            !skaleDKG.isAllDataReceived(schainHash, fromNodeIndex),
            NodeHasAlreadySentAlright(fromNodeIndex)
        );
        require(
            complaints[schainHash].nodeToComplaint == type(uint256).max,
            ComplaintIsAlreadyPending(complaints[schainHash].nodeToComplaint)
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
    ) private returns (uint256 badNode) {
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
                badNode = toNodeIndex;
            } else if (!skaleDKG.isAllDataReceived(schainHash, fromNodeIndex)) {
                // incorrect data
                badNode = fromNodeIndex;
            } else {
                revert NodeHasAlreadySentAlright(fromNodeIndex);
            }
        } else {
            require(
                complaints[schainHash].nodeToComplaint == toNodeIndex,
                ComplaintIsAlreadyPending(complaints[schainHash].nodeToComplaint)
            );
            // 30 min after incorrect data complaint
            require(
                complaints[schainHash].startComplaintBlockTimestamp +
                    _getComplaintTimeLimit(contractManager) <=
                block.timestamp,
                ComplaintSentTooEarly(schainHash)
            );
            badNode = toNodeIndex;
        }
        skaleDKG.finalizeSlashing(schainHash, badNode);
    }

    function _handleComplaintWhenNotBroadcasted(
        bytes32 schainHash,
        uint256 toNodeIndex,
        IContractManager contractManager,
        mapping(bytes32 => ISkaleDKG.Channel) storage channels
    ) private returns (uint256 badNode) {
        require(
            channels[schainHash].startedBlockTimestamp +
                _getComplaintTimeLimit(contractManager) <=
            block.timestamp,
            ComplaintSentTooEarly(schainHash)
        );
        badNode = toNodeIndex;
        ISkaleDKG(contractManager.getContract("SkaleDKG")).finalizeSlashing(
                schainHash,
                badNode
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
