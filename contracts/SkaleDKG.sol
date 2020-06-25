// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleDKG.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin

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
import "./Permissions.sol";
import "./delegation/Punisher.sol";
import "./SlashingTable.sol";
import "./Schains.sol";
import "./SchainsInternal.sol";
import "./utils/FieldOperations.sol";
import "./KeyStorage.sol";


contract SkaleDKG is Permissions {

    struct Channel {
        bool active;
        bool[] broadcasted;
        uint numberOfBroadcasted;
        uint numberOfCompleted;
        bool[] completed;
        uint startedBlockTimestamp;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockTimestamp;
    }

    uint public constant COMPLAINT_TIMELIMIT = 1800;

    mapping(bytes32 => Channel) public channels;

    mapping(bytes32 => uint) public lastSuccesfulDKG;

    event ChannelOpened(bytes32 groupIndex);

    event ChannelClosed(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 indexed groupIndex,
        uint indexed fromNode,
        G2Operations.G2Point[] verificationVector,
        KeyStorage.KeyShare[] secretKeyContribution
    );

    event AllDataReceived(bytes32 indexed groupIndex, uint nodeIndex);
    event SuccessfulDKG(bytes32 indexed groupIndex);
    event BadGuy(uint nodeIndex);
    event FailedDKG(bytes32 indexed groupIndex);
    event ComplaintSent(bytes32 indexed groupIndex, uint indexed fromNodeIndex, uint indexed toNodeIndex);
    event NewGuy(uint nodeIndex);

    modifier correctGroup(bytes32 groupIndex) {
        require(channels[groupIndex].active, "Group is not created");
        _;
    }

    modifier correctNode(bytes32 groupIndex, uint nodeIndex) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        require(
            index < SchainsInternal(contractManager.getContract("SchainsInternal"))
                .getNumberOfNodesInGroup(groupIndex),
            "Node is not in this group");
        _;
    }

    function openChannel(bytes32 groupIndex) external allow("SchainsInternal") {
        require(!channels[groupIndex].active, "Channel already is created");

        _reopenChannel(groupIndex);
    }

    function deleteChannel(bytes32 groupIndex) external allow("SchainsInternal") {
        require(channels[groupIndex].active, "Channel is not created");
        delete channels[groupIndex];
        KeyStorage(contractManager.getContract("KeyStorage")).deleteKey(groupIndex);
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        G2Operations.G2Point[] calldata verificationVector,
        KeyStorage.KeyShare[] calldata secretKeyContribution
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        require(_isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        require(verificationVector.length >= 1, "VerificationVector is empty");
        require(
            secretKeyContribution.length == schainsInternal.getNumberOfNodesInGroup(groupIndex),
            "Incorrect number of secret key shares"
        );

        _isBroadcast(
            groupIndex,
            nodeIndex,
            secretKeyContribution,
            verificationVector
        );
        KeyStorage keyStorage = KeyStorage(contractManager.getContract("KeyStorage"));
        keyStorage.adding(groupIndex, verificationVector[0]);
        keyStorage.computePublicValues(groupIndex, verificationVector);
        emit BroadcastAndKeyShare(
            groupIndex,
            nodeIndex,
            verificationVector,
            secretKeyContribution
        );
    }

    function complaint(bytes32 groupIndex, uint fromNodeIndex, uint toNodeIndex)
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
        correctNode(groupIndex, toNodeIndex)
    {
        require(_isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        bool broadcasted = _isBroadcasted(groupIndex, toNodeIndex);
        if (broadcasted && channels[groupIndex].nodeToComplaint == uint(-1)) {
            // need to wait a response from toNodeIndex
            channels[groupIndex].nodeToComplaint = toNodeIndex;
            channels[groupIndex].fromNodeToComplaint = fromNodeIndex;
            channels[groupIndex].startComplaintBlockTimestamp = block.timestamp;
            emit ComplaintSent(groupIndex, fromNodeIndex, toNodeIndex);
        } else if (broadcasted && channels[groupIndex].nodeToComplaint != toNodeIndex) {
            // will not revert if someone already sent the same complaint
            return;
        } else if (broadcasted && channels[groupIndex].nodeToComplaint == toNodeIndex) {
            require(
                channels[groupIndex].startComplaintBlockTimestamp.add(COMPLAINT_TIMELIMIT) <= block.timestamp,
                "One more complaint rejected");
            // need to penalty Node - toNodeIndex
            _finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        } else if (!broadcasted) {
            // if node have not broadcasted params
            require(
                channels[groupIndex].startedBlockTimestamp.add(COMPLAINT_TIMELIMIT) <= block.timestamp,
                "Complaint rejected"
            );
            // need to penalty Node - toNodeIndex
            _finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        }
    }

    function response(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        G2Operations.G2Point calldata multipliedShare
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {
        require(channels[groupIndex].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(_isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        bool verificationResult = KeyStorage(contractManager.getContract("KeyStorage")).verify(
            groupIndex,
            channels[groupIndex].nodeToComplaint,
            channels[groupIndex].fromNodeToComplaint,
            secretNumber,
            multipliedShare
        );
        uint badNode = (verificationResult ?
            channels[groupIndex].fromNodeToComplaint : channels[groupIndex].nodeToComplaint);
        _finalizeSlashing(groupIndex, badNode);
    }

    function alright(bytes32 groupIndex, uint fromNodeIndex)
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {
        require(_isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        uint index = _nodeIndexInSchain(groupIndex, fromNodeIndex);
        uint numberOfParticipant = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        ).getNumberOfNodesInGroup(groupIndex);
        require(numberOfParticipant == channels[groupIndex].numberOfBroadcasted, "Still Broadcasting phase");
        require(!channels[groupIndex].completed[index], "Node is already alright");
        channels[groupIndex].completed[index] = true;
        channels[groupIndex].numberOfCompleted++;
        emit AllDataReceived(groupIndex, fromNodeIndex);
        if (channels[groupIndex].numberOfCompleted == numberOfParticipant) {
            lastSuccesfulDKG[groupIndex] = now;
            KeyStorage(contractManager.getContract("KeyStorage")).finalizePublicKey(groupIndex);
            channels[groupIndex].active = false;
            emit SuccessfulDKG(groupIndex);
        }
    }

    function reopenChannel(bytes32 groupIndex) external allow("SchainsInternal") {
        _reopenChannel(groupIndex);
    }

    function isChannelOpened(bytes32 groupIndex) external view returns (bool) {
        return channels[groupIndex].active;
    }

    function getTimeOfLastSuccesfulDKG(bytes32 groupIndex) external view returns (uint) {
        return lastSuccesfulDKG[groupIndex];
    }

    function isLastDKGSuccesful(bytes32 groupIndex) external view returns (bool) {
        return channels[groupIndex].startedBlockTimestamp < lastSuccesfulDKG[groupIndex];
    }

    function isBroadcastPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        return channels[groupIndex].active &&
            index < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            !channels[groupIndex].broadcasted[index];
    }

    function isComplaintPossible(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint toNodeIndex)
        external view returns (bool)
    {
        uint indexFrom = _nodeIndexInSchain(groupIndex, fromNodeIndex);
        uint indexTo = _nodeIndexInSchain(groupIndex, toNodeIndex);
        bool complaintSending = channels[groupIndex].nodeToComplaint == uint(-1) ||
            (
                channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].startComplaintBlockTimestamp.add(COMPLAINT_TIMELIMIT) <= block.timestamp &&
                channels[groupIndex].nodeToComplaint == toNodeIndex
            ) ||
            (
                !channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].nodeToComplaint == toNodeIndex &&
                channels[groupIndex].startedBlockTimestamp.add(COMPLAINT_TIMELIMIT) <= block.timestamp
            );
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        return channels[groupIndex].active &&
            indexFrom < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            indexTo < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    function isAlrightPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        return channels[groupIndex].active &&
            index < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            schainsInternal.getNumberOfNodesInGroup(groupIndex) == channels[groupIndex].numberOfBroadcasted &&
            !channels[groupIndex].completed[index];
    }

    function isResponsePossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        return channels[groupIndex].active &&
            index < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            channels[groupIndex].nodeToComplaint == nodeIndex;
    }

    function isAllDataReceived(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        return channels[groupIndex].completed[index];
    }

    function getComplaintData(bytes32 groupIndex) external view returns (uint, uint) {
        return (channels[groupIndex].fromNodeToComplaint, channels[groupIndex].nodeToComplaint);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

    function _reopenChannel(bytes32 groupIndex) private {
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        );

        channels[groupIndex].active = true;
        delete channels[groupIndex].completed;
        delete channels[groupIndex].broadcasted;
        channels[groupIndex].broadcasted = new bool[](schainsInternal.getNumberOfNodesInGroup(groupIndex));
        channels[groupIndex].completed = new bool[](schainsInternal.getNumberOfNodesInGroup(groupIndex));
        KeyStorage(contractManager.getContract("KeyStorage")).initPublicKeyInProgress(groupIndex);
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        delete channels[groupIndex].numberOfBroadcasted;
        delete channels[groupIndex].numberOfCompleted;
        delete channels[groupIndex].startComplaintBlockTimestamp;
        channels[groupIndex].startedBlockTimestamp = now;

        emit ChannelOpened(groupIndex);
    }

    function _finalizeSlashing(bytes32 groupIndex, uint badNode) private {
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        );
        Schains schains = Schains(
            contractManager.getContract("Schains")
        );
        emit BadGuy(badNode);
        emit FailedDKG(groupIndex);

        _reopenChannel(groupIndex);
        if (schainsInternal.isAnyFreeNode(groupIndex)) {
            uint newNode = schains.rotateNode(
                badNode,
                groupIndex
            );
            emit NewGuy(newNode);
        } else {
            schainsInternal.removeNodeFromSchain(
                badNode,
                groupIndex
            );
            channels[groupIndex].active = false;
        }

        Punisher punisher = Punisher(contractManager.getContract("Punisher"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        SlashingTable slashingTable = SlashingTable(contractManager.getContract("SlashingTable"));

        punisher.slash(nodes.getValidatorId(badNode), slashingTable.getPenalty("FailedDKG"));
    }

    function _isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        KeyStorage.KeyShare[] memory secretKeyContribution,
        G2Operations.G2Point[] memory verificationVector
    )
        private
    {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        require(!channels[groupIndex].broadcasted[index], "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
        channels[groupIndex].numberOfBroadcasted++;
        KeyStorage(contractManager.getContract("KeyStorage")).addBroadcastedData(
            groupIndex,
            index,
            secretKeyContribution,
            verificationVector
        );
    }

    function _isBroadcasted(bytes32 groupIndex, uint nodeIndex) private view returns (bool) {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        return channels[groupIndex].broadcasted[index];
    }

    function _nodeIndexInSchain(bytes32 schainId, uint nodeIndex) private view returns (uint) {
        return SchainsInternal(contractManager.getContract("SchainsInternal"))
            .getNodeIndexInGroup(schainId, nodeIndex);
    }

    function _isNodeByMessageSender(uint nodeIndex, address from) private view returns (bool) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        return nodes.isNodeExist(from, nodeIndex);
    }
}
