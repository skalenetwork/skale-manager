pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./SkaleDKG.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKGAlright is SkaleDKG {

    function alright(bytes32 schainId, uint fromNodeIndex)
        external
        override
        correctGroup(schainId)
        onlyNodeOwner(fromNodeIndex)
    {
        uint gasTotal = gasleft();
        (uint index, ) = _checkAndReturnIndexInGroup(schainId, fromNodeIndex, true);
        uint numberOfParticipant = channels[schainId].n;
        require(numberOfParticipant == dkgProcess[schainId].numberOfBroadcasted, "Still Broadcasting phase");
        require(
            complaints[schainId].fromNodeToComplaint != fromNodeIndex ||
            (fromNodeIndex == 0 && complaints[schainId].startComplaintBlockTimestamp == 0),
            "Node has already sent complaint"
        );
        require(!dkgProcess[schainId].completed[index], "Node is already alright");
        dkgProcess[schainId].completed[index] = true;
        dkgProcess[schainId].numberOfCompleted++;
        emit AllDataReceived(schainId, fromNodeIndex);
        if (dkgProcess[schainId].numberOfCompleted == numberOfParticipant) {
            _setSuccesfulDKG(schainId);
        }
        _refundGasBySchain(gasTotal, schainId, fromNodeIndex);
    }

    function _setSuccesfulDKG(bytes32 schainId) internal {
        lastSuccesfulDKG[schainId] = now;
        channels[schainId].active = false;
        KeyStorage(contractManager.getContract("KeyStorage")).finalizePublicKey(schainId);
        emit SuccessfulDKG(schainId);
    }



}