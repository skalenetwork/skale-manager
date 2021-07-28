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
import "./NodeRotation.sol";
import "./KeyStorage.sol";
import "./interfaces/ISkaleDKG.sol";
import "./thirdparty/ECDH.sol";
import "./utils/Precompiled.sol";
import "./Wallets.sol";
import "./dkg/SkaleDkgAlright.sol";
import "./dkg/SkaleDkgBroadcast.sol";
import "./dkg/SkaleDkgComplaint.sol";
import "./dkg/SkaleDkgPreResponse.sol";
import "./dkg/SkaleDkgResponse.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKG is Permissions, ISkaleDKG {
    using Fp2Operations for Fp2Operations.Fp2Point;
    using G2Operations for G2Operations.G2Point;

    enum DkgFunction {Broadcast, Alright, ComplaintBadData, PreResponse, Complaint, Response}

    struct Channel {
        bool active;
        uint n;
        uint startedBlockTimestamp;
        uint startedBlock;
    }

    struct ProcessDKG {
        uint numberOfBroadcasted;
        uint numberOfCompleted;
        bool[] broadcasted;
        bool[] completed;
    }

    struct ComplaintData {
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockTimestamp;
        bool isResponse;
        bytes32 keyShare;
        G2Operations.G2Point sumOfVerVec;
    }

    struct KeyShare {
        bytes32[2] publicKey;
        bytes32 share;
    }

    struct Context {
        bool isDebt;
        uint delta;
        DkgFunction dkgFunction;
    }

    uint public constant COMPLAINT_TIMELIMIT = 1800;

    mapping(bytes32 => Channel) public channels;

    mapping(bytes32 => uint) public lastSuccessfulDKG;

    mapping(bytes32 => ProcessDKG) public dkgProcess;

    mapping(bytes32 => ComplaintData) public complaints;

    mapping(bytes32 => uint) public startAlrightTimestamp;

    mapping(bytes32 => mapping(uint => bytes32)) public hashedData;
    
    mapping(bytes32 => uint) private _badNodes;
    
    /**
     * @dev Emitted when a channel is opened.
     */
    event ChannelOpened(bytes32 schainHash);

    /**
     * @dev Emitted when a channel is closed.
     */
    event ChannelClosed(bytes32 schainHash);

    /**
     * @dev Emitted when a node broadcasts keyshare.
     */
    event BroadcastAndKeyShare(
        bytes32 indexed schainHash,
        uint indexed fromNode,
        G2Operations.G2Point[] verificationVector,
        KeyShare[] secretKeyContribution
    );

    /**
     * @dev Emitted when all group data is received by node.
     */
    event AllDataReceived(bytes32 indexed schainHash, uint nodeIndex);

    /**
     * @dev Emitted when DKG is successful.
     */
    event SuccessfulDKG(bytes32 indexed schainHash);

    /**
     * @dev Emitted when a complaint against a node is verified.
     */
    event BadGuy(uint nodeIndex);

    /**
     * @dev Emitted when DKG failed.
     */
    event FailedDKG(bytes32 indexed schainHash);

    /**
     * @dev Emitted when a new node is rotated in.
     */
    event NewGuy(uint nodeIndex);

    /**
     * @dev Emitted when an incorrect complaint is sent.
     */
    event ComplaintError(string error);

    /**
     * @dev Emitted when a complaint is sent.
     */
    event ComplaintSent(
        bytes32 indexed schainHash, uint indexed fromNodeIndex, uint indexed toNodeIndex);

    modifier correctGroup(bytes32 schainHash) {
        require(channels[schainHash].active, "Group is not created");
        _;
    }

    modifier correctGroupWithoutRevert(bytes32 schainHash) {
        if (!channels[schainHash].active) {
            emit ComplaintError("Group is not created");
        } else {
            _;
        }
    }

    modifier correctNode(bytes32 schainHash, uint nodeIndex) {
        (uint index, ) = checkAndReturnIndexInGroup(schainHash, nodeIndex, true);
        _;
    }

    modifier correctNodeWithoutRevert(bytes32 schainHash, uint nodeIndex) {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        if (!check) {
            emit ComplaintError("Node is not in this group");
        } else {
            _;
        }
    }

    modifier onlyNodeOwner(uint nodeIndex) {
        _checkMsgSenderIsNodeOwner(nodeIndex);
        _;
    }
    
    modifier refundGasBySchain(bytes32 schainHash, Context memory context) {
        uint gasTotal = gasleft();
        _;
        _refundGasBySchain(schainHash, gasTotal, context);
    }

    modifier refundGasByValidatorToSchain(bytes32 schainHash, Context memory context) {
        uint gasTotal = gasleft();
        _;
        _refundGasBySchain(schainHash, gasTotal, context);
        _refundGasByValidatorToSchain(schainHash);
    }

    function alright(bytes32 schainHash, uint fromNodeIndex)
        external
        refundGasBySchain(schainHash, 
            Context({
                isDebt: false,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).ALRIGHT_DELTA(), 
                dkgFunction: DkgFunction.Alright
        }))
        correctGroup(schainHash)
        onlyNodeOwner(fromNodeIndex)
    {
        SkaleDkgAlright.alright(
            schainHash,
            fromNodeIndex,
            contractManager,
            channels,
            dkgProcess,
            complaints,
            lastSuccessfulDKG,
            startAlrightTimestamp
        );
    }

    function broadcast(
        bytes32 schainHash,
        uint nodeIndex,
        G2Operations.G2Point[] memory verificationVector,
        KeyShare[] memory secretKeyContribution
    )
        external
        refundGasBySchain(schainHash,
            Context({
                isDebt: false,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).BROADCAST_DELTA(),
                dkgFunction: DkgFunction.Broadcast
        }))
        correctGroup(schainHash)
        onlyNodeOwner(nodeIndex)
    {
        SkaleDkgBroadcast.broadcast(
            schainHash,
            nodeIndex,
            verificationVector,
            secretKeyContribution,
            contractManager,
            channels,
            dkgProcess,
            hashedData
        );
    }


    function complaintBadData(bytes32 schainHash, uint fromNodeIndex, uint toNodeIndex)
        external
        refundGasBySchain(
            schainHash,
            Context({
                isDebt: true,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).COMPLAINT_BAD_DATA_DELTA(),
                dkgFunction: DkgFunction.ComplaintBadData
        }))
        correctGroupWithoutRevert(schainHash)
        correctNode(schainHash, fromNodeIndex)
        correctNodeWithoutRevert(schainHash, toNodeIndex)
        onlyNodeOwner(fromNodeIndex)
    { 
        SkaleDkgComplaint.complaintBadData(
            schainHash,
            fromNodeIndex,
            toNodeIndex,
            contractManager,
            complaints
        );
    }

    function preResponse(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Operations.G2Point[] memory verificationVector,
        G2Operations.G2Point[] memory verificationVectorMult,
        KeyShare[] memory secretKeyContribution
    )
        external
        refundGasBySchain(
            schainId,
            Context({
                isDebt: true,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).PRE_RESPONSE_DELTA(),
                dkgFunction: DkgFunction.PreResponse
        }))
        correctGroup(schainId)
        onlyNodeOwner(fromNodeIndex)
    {
        SkaleDkgPreResponse.preResponse(
            schainId,
            fromNodeIndex,
            verificationVector,
            verificationVectorMult,
            secretKeyContribution,
            contractManager,
            complaints,
            hashedData
        );
    }

    function complaint(bytes32 schainHash, uint fromNodeIndex, uint toNodeIndex)
        external
        refundGasByValidatorToSchain(
            schainHash,
            Context({
                isDebt: true,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).COMPLAINT_DELTA(),
                dkgFunction: DkgFunction.Complaint
        }))
        correctGroupWithoutRevert(schainHash)
        correctNode(schainHash, fromNodeIndex)
        correctNodeWithoutRevert(schainHash, toNodeIndex)
        onlyNodeOwner(fromNodeIndex)
    {
        SkaleDkgComplaint.complaint(
            schainHash,
            fromNodeIndex,
            toNodeIndex,
            contractManager,
            channels,
            complaints,
            startAlrightTimestamp
        );
    }

    function response(
        bytes32 schainHash,
        uint fromNodeIndex,
        uint secretNumber,
        G2Operations.G2Point memory multipliedShare
    )
        external
        refundGasByValidatorToSchain(
            schainHash,
            Context({isDebt: true,
                delta: ConstantsHolder(contractManager.getConstantsHolder()).RESPONSE_DELTA(),
                dkgFunction: DkgFunction.Response
        }))
        correctGroup(schainHash)
        onlyNodeOwner(fromNodeIndex)
    {
        SkaleDkgResponse.response(
            schainHash,
            fromNodeIndex,
            secretNumber,
            multipliedShare,
            contractManager,
            channels,
            complaints
        );
    }

    /**
     * @dev Allows Schains and NodeRotation contracts to open a channel.
     * 
     * Emits a {ChannelOpened} event.
     * 
     * Requirements:
     * 
     * - Channel is not already created.
     */
    function openChannel(bytes32 schainHash) external override allowTwo("Schains","NodeRotation") {
        _openChannel(schainHash);
    }

    /**
     * @dev Allows SchainsInternal contract to delete a channel.
     *
     * Requirements:
     *
     * - Channel must exist.
     */
    function deleteChannel(bytes32 schainHash) external override allow("SchainsInternal") {
        delete channels[schainHash];
        delete dkgProcess[schainHash];
        delete complaints[schainHash];
        KeyStorage(contractManager.getContract("KeyStorage")).deleteKey(schainHash);
    }

    function setStartAlrightTimestamp(bytes32 schainHash) external allow("SkaleDKG") {
        startAlrightTimestamp[schainHash] = now;
    }

    function setBadNode(bytes32 schainHash, uint nodeIndex) external allow("SkaleDKG") {
        _badNodes[schainHash] = nodeIndex;
    }

    function finalizeSlashing(bytes32 schainHash, uint badNode) external allow("SkaleDKG") {
        NodeRotation nodeRotation = NodeRotation(contractManager.getContract("NodeRotation"));
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        );
        emit BadGuy(badNode);
        emit FailedDKG(schainHash);

        schainsInternal.makeSchainNodesInvisible(schainHash);
        if (schainsInternal.isAnyFreeNode(schainHash)) {
            uint newNode = nodeRotation.rotateNode(
                badNode,
                schainHash,
                false,
                true
            );
            emit NewGuy(newNode);
        } else {
            _openChannel(schainHash);
            schainsInternal.removeNodeFromSchain(
                badNode,
                schainHash
            );
            channels[schainHash].active = false;
        }
        schainsInternal.makeSchainNodesVisible(schainHash);
        Punisher(contractManager.getPunisher()).slash(
            Nodes(contractManager.getContract("Nodes")).getValidatorId(badNode),
            SlashingTable(contractManager.getContract("SlashingTable")).getPenalty("FailedDKG")
        );
    }

    function getChannelStartedTime(bytes32 schainHash) external view returns (uint) {
        return channels[schainHash].startedBlockTimestamp;
    }

    function getChannelStartedBlock(bytes32 schainHash) external view returns (uint) {
        return channels[schainHash].startedBlock;
    }

    function getNumberOfBroadcasted(bytes32 schainHash) external view returns (uint) {
        return dkgProcess[schainHash].numberOfBroadcasted;
    }

    function getNumberOfCompleted(bytes32 schainHash) external view returns (uint) {
        return dkgProcess[schainHash].numberOfCompleted;
    }

    function getTimeOfLastSuccessfulDKG(bytes32 schainHash) external view returns (uint) {
        return lastSuccessfulDKG[schainHash];
    }

    function getComplaintData(bytes32 schainHash) external view returns (uint, uint) {
        return (complaints[schainHash].fromNodeToComplaint, complaints[schainHash].nodeToComplaint);
    }

    function getComplaintStartedTime(bytes32 schainHash) external view returns (uint) {
        return complaints[schainHash].startComplaintBlockTimestamp;
    }

    function getAlrightStartedTime(bytes32 schainHash) external view returns (uint) {
        return startAlrightTimestamp[schainHash];
    }

    /**
     * @dev Checks whether channel is opened.
     */
    function isChannelOpened(bytes32 schainHash) external override view returns (bool) {
        return channels[schainHash].active;
    }

    function isLastDKGSuccessful(bytes32 schainHash) external override view returns (bool) {
        return channels[schainHash].startedBlockTimestamp <= lastSuccessfulDKG[schainHash];
    }

    /**
     * @dev Checks whether broadcast is possible.
     */
    function isBroadcastPossible(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (uint index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            channels[schainHash].startedBlockTimestamp.add(_getComplaintTimelimit()) > block.timestamp &&
            !dkgProcess[schainHash].broadcasted[index];
    }

    /**
     * @dev Checks whether complaint is possible.
     */
    function isComplaintPossible(
        bytes32 schainHash,
        uint fromNodeIndex,
        uint toNodeIndex
    )
        external
        view
        returns (bool)
    {
        (uint indexFrom, bool checkFrom) = checkAndReturnIndexInGroup(schainHash, fromNodeIndex, false);
        (uint indexTo, bool checkTo) = checkAndReturnIndexInGroup(schainHash, toNodeIndex, false);
        if (!checkFrom || !checkTo)
            return false;
        bool complaintSending = (
                complaints[schainHash].nodeToComplaint == uint(-1) &&
                dkgProcess[schainHash].broadcasted[indexTo] &&
                !dkgProcess[schainHash].completed[indexFrom]
            ) ||
            (
                dkgProcess[schainHash].broadcasted[indexTo] &&
                complaints[schainHash].startComplaintBlockTimestamp.add(_getComplaintTimelimit()) <= block.timestamp &&
                complaints[schainHash].nodeToComplaint == toNodeIndex
            ) ||
            (
                !dkgProcess[schainHash].broadcasted[indexTo] &&
                complaints[schainHash].nodeToComplaint == uint(-1) &&
                channels[schainHash].startedBlockTimestamp.add(_getComplaintTimelimit()) <= block.timestamp
            ) ||
            (
                complaints[schainHash].nodeToComplaint == uint(-1) &&
                isEveryoneBroadcasted(schainHash) &&
                dkgProcess[schainHash].completed[indexFrom] &&
                !dkgProcess[schainHash].completed[indexTo] &&
                startAlrightTimestamp[schainHash].add(_getComplaintTimelimit()) <= block.timestamp
            );
        return channels[schainHash].active &&
            dkgProcess[schainHash].broadcasted[indexFrom] &&
            _isNodeOwnedByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    /**
     * @dev Checks whether sending Alright response is possible.
     */
    function isAlrightPossible(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (uint index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            channels[schainHash].n == dkgProcess[schainHash].numberOfBroadcasted &&
            (complaints[schainHash].fromNodeToComplaint != nodeIndex ||
            (nodeIndex == 0 && complaints[schainHash].startComplaintBlockTimestamp == 0)) &&
            startAlrightTimestamp[schainHash].add(_getComplaintTimelimit()) > block.timestamp &&
            !dkgProcess[schainHash].completed[index];
    }

    /**
     * @dev Checks whether sending a pre-response is possible.
     */
    function isPreResponsePossible(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            complaints[schainHash].nodeToComplaint == nodeIndex &&
            complaints[schainHash].startComplaintBlockTimestamp.add(_getComplaintTimelimit()) > block.timestamp &&
            !complaints[schainHash].isResponse;
    }

    /**
     * @dev Checks whether sending a response is possible.
     */
    function isResponsePossible(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            complaints[schainHash].nodeToComplaint == nodeIndex &&
            complaints[schainHash].startComplaintBlockTimestamp.add(_getComplaintTimelimit()) > block.timestamp &&
            complaints[schainHash].isResponse;
    }

    function isNodeBroadcasted(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (uint index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return check && dkgProcess[schainHash].broadcasted[index];
    }

     /**
     * @dev Checks whether all data has been received by node.
     */
    function isAllDataReceived(bytes32 schainHash, uint nodeIndex) external view returns (bool) {
        (uint index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return check && dkgProcess[schainHash].completed[index];
    }

    function hashData(
        KeyShare[] memory secretKeyContribution,
        G2Operations.G2Point[] memory verificationVector
    )
        external
        pure
        returns (bytes32)
    {
        bytes memory data;
        for (uint i = 0; i < secretKeyContribution.length; i++) {
            data = abi.encodePacked(data, secretKeyContribution[i].publicKey, secretKeyContribution[i].share);
        }
        for (uint i = 0; i < verificationVector.length; i++) {
            data = abi.encodePacked(
                data,
                verificationVector[i].x.a,
                verificationVector[i].x.b,
                verificationVector[i].y.a,
                verificationVector[i].y.b
            );
        }
        return keccak256(data);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

    function checkAndReturnIndexInGroup(
        bytes32 schainHash,
        uint nodeIndex,
        bool revertCheck
    )
        public
        view
        returns (uint, bool)
    {
        uint index = SchainsInternal(contractManager.getContract("SchainsInternal"))
            .getNodeIndexInGroup(schainHash, nodeIndex);
        if (index >= channels[schainHash].n && revertCheck) {
            revert("Node is not in this group");
        }
        return (index, index < channels[schainHash].n);
    }

    function isEveryoneBroadcasted(bytes32 schainHash) public view returns (bool) {
        return channels[schainHash].n == dkgProcess[schainHash].numberOfBroadcasted;
    }

    function _refundGasBySchain(bytes32 schainHash, uint gasTotal, Context memory context) private {
        Wallets wallets = Wallets(payable(contractManager.getContract("Wallets")));
        bool isLastNode = channels[schainHash].n == dkgProcess[schainHash].numberOfCompleted;
        if (context.dkgFunction == DkgFunction.Alright && isLastNode) {
            wallets.refundGasBySchain(
                schainHash, msg.sender, gasTotal.sub(gasleft()).add(context.delta).sub(74800), context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Complaint && gasTotal.sub(gasleft()) > 14e5) {
            wallets.refundGasBySchain(
                schainHash, msg.sender, gasTotal.sub(gasleft()).add(context.delta).sub(590000), context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Complaint && gasTotal.sub(gasleft()) > 7e5) {
            wallets.refundGasBySchain(
                schainHash, msg.sender, gasTotal.sub(gasleft()).add(context.delta).sub(250000), context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Response){
            wallets.refundGasBySchain(
                schainHash, msg.sender, gasTotal.sub(gasleft()).sub(context.delta), context.isDebt
            );
        } else {
            wallets.refundGasBySchain(
                schainHash, msg.sender, gasTotal.sub(gasleft()).add(context.delta), context.isDebt
            );
        }
    }

    function _refundGasByValidatorToSchain(bytes32 schainHash) private {
        uint validatorId = Nodes(contractManager.getContract("Nodes"))
         .getValidatorId(_badNodes[schainHash]);
         Wallets(payable(contractManager.getContract("Wallets")))
         .refundGasByValidatorToSchain(validatorId, schainHash);
        delete _badNodes[schainHash];
    }

    function _openChannel(bytes32 schainHash) private {
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        );

        uint len = schainsInternal.getNumberOfNodesInGroup(schainHash);
        channels[schainHash].active = true;
        channels[schainHash].n = len;
        delete dkgProcess[schainHash].completed;
        delete dkgProcess[schainHash].broadcasted;
        dkgProcess[schainHash].broadcasted = new bool[](len);
        dkgProcess[schainHash].completed = new bool[](len);
        complaints[schainHash].fromNodeToComplaint = uint(-1);
        complaints[schainHash].nodeToComplaint = uint(-1);
        delete complaints[schainHash].startComplaintBlockTimestamp;
        delete dkgProcess[schainHash].numberOfBroadcasted;
        delete dkgProcess[schainHash].numberOfCompleted;
        channels[schainHash].startedBlockTimestamp = now;
        channels[schainHash].startedBlock = block.number;
        KeyStorage(contractManager.getContract("KeyStorage")).initPublicKeyInProgress(schainHash);

        emit ChannelOpened(schainHash);
    }

    function _isNodeOwnedByMessageSender(uint nodeIndex, address from) private view returns (bool) {
        return Nodes(contractManager.getContract("Nodes")).isNodeExist(from, nodeIndex);
    }

    function _checkMsgSenderIsNodeOwner(uint nodeIndex) private view {
        require(_isNodeOwnedByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
    }

    function _getComplaintTimelimit() private view returns (uint) {
        return ConstantsHolder(contractManager.getConstantsHolder()).complaintTimelimit();
    }
}
