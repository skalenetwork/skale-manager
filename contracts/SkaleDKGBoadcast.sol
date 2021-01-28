pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./SkaleDKG.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKGBroadcast is SkaleDKG {

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
        bytes32 schainId,
        uint nodeIndex,
        G2Operations.G2Point[] calldata verificationVector,
        KeyShare[] calldata secretKeyContribution
    )
        external
        override
        correctGroup(schainId)
        onlyNodeOwner(nodeIndex)
    {
        uint gasTotal = gasleft();
        uint n = channels[schainId].n;
        require(verificationVector.length == getT(n), "Incorrect number of verification vectors");
        require(
            secretKeyContribution.length == n,
            "Incorrect number of secret key shares"
        );
        (uint index, ) = _checkAndReturnIndexInGroup(schainId, nodeIndex, true);
        require(!dkgProcess[schainId].broadcasted[index], "This node has already broadcasted");
        dkgProcess[schainId].broadcasted[index] = true;
        dkgProcess[schainId].numberOfBroadcasted++;
        if (dkgProcess[schainId].numberOfBroadcasted == channels[schainId].n) {
            startAlrightTimestamp[schainId] = now;
        }
        hashedData[schainId][index] = _hashData(secretKeyContribution, verificationVector);
        KeyStorage(contractManager.getContract("KeyStorage")).adding(schainId, verificationVector[0]);
        emit BroadcastAndKeyShare(
            schainId,
            nodeIndex,
            verificationVector,
            secretKeyContribution
        );
        _refundGasBySchain(gasTotal, schainId, nodeIndex);
    }



    function getT(uint n) public pure returns (uint) {
        return n.mul(2).add(1).div(3);
    }




}