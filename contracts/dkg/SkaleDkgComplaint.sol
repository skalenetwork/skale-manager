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

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "../SkaleDKG.sol";
import "../ConstantsHolder.sol";
import "../Wallets.sol";
import "../Nodes.sol";

/**
 * @title SkaleDkgComplaint
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
library SkaleDkgComplaint {
    using SafeMath for uint;

    /**
     * @dev Emitted when an incorrect complaint is sent.
     */
    event ComplaintError(string error);

    /**
     * @dev Emitted when a complaint is sent.
     */
    event ComplaintSent(
        bytes32 indexed schainId, uint indexed fromNodeIndex, uint indexed toNodeIndex);


    /**
     * @dev Creates a complaint from a node (accuser) to a given node.
     * The accusing node must broadcast additional parameters within 1800 blocks.
     *
     * Emits {ComplaintSent} or {ComplaintError} event.
     *
     * Requirements:
     *
     * - `msg.sender` must have an associated node.
     */
    function complaint(
        bytes32 schainId,
        uint fromNodeIndex,
        uint toNodeIndex,
        address payable spender,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.Channel) storage channels,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => uint) storage startAlrightTimestamp
    )
        external
    {
        uint gasTotal = gasleft();
        SkaleDKG skaleDKG = SkaleDKG(contractManager.getContract("SkaleDKG"));
        require(skaleDKG.isNodeBroadcasted(schainId, fromNodeIndex), "Node has not broadcasted");
        if (skaleDKG.isNodeBroadcasted(schainId, toNodeIndex)) {
            _handleComplaintWhenBroadcasted(
                schainId,
                fromNodeIndex,
                toNodeIndex,
                contractManager,
                complaints,
                startAlrightTimestamp
            );
        } else {
            // not broadcasted in 30 min
            _handleComplaintWhenNotBroadcasted(schainId, toNodeIndex, contractManager, channels);
        }
         uint validatorId = Nodes(contractManager.getContract("Nodes")).getValidatorId(toNodeIndex);
         Wallets(payable(contractManager.getContract("Wallets")))
         .refundGasBySchain(schainId, spender, gasTotal - gasleft(), true);
         Wallets(payable(contractManager.getContract("Wallets")))
         .refundGasByValidatorToSchain(validatorId, schainId);
    }

    function complaintBadData(
        bytes32 schainId,
        uint fromNodeIndex,
        uint toNodeIndex,
        address payable spender,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints
    )
        external
    { 
        uint gasTotal = gasleft();
        SkaleDKG skaleDKG = SkaleDKG(contractManager.getContract("SkaleDKG"));
        require(skaleDKG.isNodeBroadcasted(schainId, fromNodeIndex), "Node has not broadcasted");
        require(skaleDKG.isNodeBroadcasted(schainId, toNodeIndex), "Accused node has not broadcasted");
        require(!skaleDKG.isAllDataReceived(schainId, fromNodeIndex), "Node has already sent alright");
        if (complaints[schainId].nodeToComplaint == uint(-1)) {
            complaints[schainId].nodeToComplaint = toNodeIndex;
            complaints[schainId].fromNodeToComplaint = fromNodeIndex;
            complaints[schainId].startComplaintBlockTimestamp = block.timestamp;
            emit ComplaintSent(schainId, fromNodeIndex, toNodeIndex);
        } else {
            emit ComplaintError("First complaint has already been processed");
        }
         Wallets(payable(contractManager.getContract("Wallets")))
        .refundGasBySchain(schainId, spender, gasTotal - gasleft(), true);
    }

    function _handleComplaintWhenBroadcasted(
        bytes32 schainId,
        uint fromNodeIndex,
        uint toNodeIndex,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.ComplaintData) storage complaints,
        mapping(bytes32 => uint) storage startAlrightTimestamp
    )
        private
    {
        SkaleDKG skaleDKG = SkaleDKG(contractManager.getContract("SkaleDKG"));
        // missing alright
        if (complaints[schainId].nodeToComplaint == uint(-1)) {
            if (
                skaleDKG.isEveryoneBroadcasted(schainId) &&
                !skaleDKG.isAllDataReceived(schainId, toNodeIndex) &&
                startAlrightTimestamp[schainId].add(_getComplaintTimelimit(contractManager)) <= block.timestamp
            ) {
                // missing alright
                skaleDKG.finalizeSlashing(schainId, toNodeIndex);
                return;
            } else if (!skaleDKG.isAllDataReceived(schainId, fromNodeIndex)) {
                // incorrect data
                skaleDKG.finalizeSlashing(schainId, fromNodeIndex);
                return;
            }
            emit ComplaintError("Has already sent alright");
            return;
        } else if (complaints[schainId].nodeToComplaint == toNodeIndex) {
            // 30 min after incorrect data complaint
            if (complaints[schainId].startComplaintBlockTimestamp.add(
                _getComplaintTimelimit(contractManager)
            ) <= block.timestamp) {
                skaleDKG.finalizeSlashing(schainId, complaints[schainId].nodeToComplaint);
                return;
            }
            emit ComplaintError("The same complaint rejected");
            return;
        }
        emit ComplaintError("One complaint is already sent");
    }


    function _handleComplaintWhenNotBroadcasted(
        bytes32 schainId,
        uint toNodeIndex,
        ContractManager contractManager,
        mapping(bytes32 => SkaleDKG.Channel) storage channels
    ) 
        private
    {
        if (channels[schainId].startedBlockTimestamp.add(_getComplaintTimelimit(contractManager)) <= block.timestamp) {
            SkaleDKG(contractManager.getContract("SkaleDKG")).finalizeSlashing(schainId, toNodeIndex);
            return;
        }
        emit ComplaintError("Complaint sent too early");
    }

    function _getComplaintTimelimit(ContractManager contractManager) private view returns (uint) {
        return ConstantsHolder(contractManager.getConstantsHolder()).complaintTimelimit();
    }

}
