pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./SkaleDKG.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKGComplaint is SkaleDKG {

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
    function complaint(bytes32 schainId, uint fromNodeIndex, uint toNodeIndex)
        external
        override
        correctGroupWithoutRevert(schainId)
        correctNode(schainId, fromNodeIndex)
        correctNodeWithoutRevert(schainId, toNodeIndex)
        onlyNodeOwner(fromNodeIndex)
    {
        uint gasTotal = gasleft();
        require(isNodeBroadcasted(schainId, fromNodeIndex), "Node has not broadcasted");
        if (isNodeBroadcasted(schainId, toNodeIndex)) {
            _handleComplaintWhenBroadcasted(schainId, fromNodeIndex, toNodeIndex);
        } else {
            // not broadcasted in 30 min
            _handleComplaintWhenNotBroadcasted(schainId, toNodeIndex);
        }
         uint validatorId = Nodes(contractManager.getContract("Nodes")).getValidatorId(toNodeIndex);
        _refundGasByValidator(validatorId, toNodeIndex, gasTotal - gasleft());
    }

    function complaintBadData(bytes32 schainId, uint fromNodeIndex, uint toNodeIndex)
        external
        override
        correctGroupWithoutRevert(schainId)
        correctNode(schainId, fromNodeIndex)
        correctNodeWithoutRevert(schainId, toNodeIndex)
        onlyNodeOwner(fromNodeIndex)
    { 
        uint gasTotal = gasleft();
        require(isNodeBroadcasted(schainId, fromNodeIndex), "Node has not broadcasted");
        require(isNodeBroadcasted(schainId, toNodeIndex), "Accused node has not broadcasted");
        require(!isAllDataReceived(schainId, fromNodeIndex), "Node has already sent alright");
        _processComplaint(schainId, fromNodeIndex, toNodeIndex);
        _refundGasBySchain(schainId, fromNodeIndex, gasTotal - gasleft());
    }

    function _handleComplaintWhenBroadcasted(bytes32 schainId, uint fromNodeIndex, uint toNodeIndex) private {
        // missing alright
        if (complaints[schainId].nodeToComplaint == uint(-1)) {
            if (
                isEveryoneBroadcasted(schainId) &&
                !isAllDataReceived(schainId, toNodeIndex) &&
                startAlrightTimestamp[schainId].add(_getComplaintTimelimit()) <= block.timestamp
            ) {
                // missing alright
                _finalizeSlashing(schainId, toNodeIndex);
                return;
            } else if (!isAllDataReceived(schainId, fromNodeIndex)) {
                // incorrect data
                _finalizeSlashing(schainId, fromNodeIndex);
                return;
            }
            emit ComplaintError("Has already sent alright");
            return;
        } else if (complaints[schainId].nodeToComplaint == toNodeIndex) {
            // 30 min after incorrect data complaint
            if (complaints[schainId].startComplaintBlockTimestamp.add(_getComplaintTimelimit()) <= block.timestamp) {
                _finalizeSlashing(schainId, complaints[schainId].nodeToComplaint);
                return;
            }
            emit ComplaintError("The same complaint rejected");
            return;
        }
        emit ComplaintError("One complaint is already sent");
    }


    function _handleComplaintWhenNotBroadcasted(bytes32 schainId, uint toNodeIndex) private {
        if (channels[schainId].startedBlockTimestamp.add(_getComplaintTimelimit()) <= block.timestamp) {
            _finalizeSlashing(schainId, toNodeIndex);
            return;
        }
        emit ComplaintError("Complaint sent too early");
    }

    function _processComplaint(bytes32 schainId, uint fromNodeIndex, uint toNodeIndex) private {
        if (complaints[schainId].nodeToComplaint == uint(-1)) {
            complaints[schainId].nodeToComplaint = toNodeIndex;
            complaints[schainId].fromNodeToComplaint = fromNodeIndex;
            complaints[schainId].startComplaintBlockTimestamp = block.timestamp;
            emit ComplaintSent(schainId, fromNodeIndex, toNodeIndex);
        } else {
            emit ComplaintError("First complaint has already been processed");
        }
    }


}
