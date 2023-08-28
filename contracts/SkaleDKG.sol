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

pragma solidity 0.8.17;

import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { ISlashingTable } from "@skalenetwork/skale-manager-interfaces/ISlashingTable.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { INodeRotation } from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";
import { IKeyStorage } from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import { IWallets } from "@skalenetwork/skale-manager-interfaces/IWallets.sol";
import { IPunisher } from "@skalenetwork/skale-manager-interfaces/delegation/IPunisher.sol";

import { Permissions } from "./Permissions.sol";
import { ConstantsHolder } from "./ConstantsHolder.sol";
import { Fp2Operations, G2Operations } from "./utils/FieldOperations.sol";
import { SkaleDkgAlright } from "./dkg/SkaleDkgAlright.sol";
import { SkaleDkgBroadcast } from "./dkg/SkaleDkgBroadcast.sol";
import { SkaleDkgComplaint } from "./dkg/SkaleDkgComplaint.sol";
import { SkaleDkgPreResponse } from "./dkg/SkaleDkgPreResponse.sol";
import { SkaleDkgResponse } from "./dkg/SkaleDkgResponse.sol";

/**
 * @title SkaleDKG
 * @dev Contains functions to manage distributed key generation per
 * Joint-Feldman protocol.
 */
contract SkaleDKG is Permissions, ISkaleDKG {
    using Fp2Operations for ISkaleDKG.Fp2Point;
    using G2Operations for ISkaleDKG.G2Point;

    enum DkgFunction {Broadcast, Alright, ComplaintBadData, PreResponse, Complaint, Response}

    struct Context {
        bool isDebt;
        uint256 delta;
        DkgFunction dkgFunction;
    }

    mapping(bytes32 => Channel) public channels;

    mapping(bytes32 => uint256) public lastSuccessfulDKG;

    mapping(bytes32 => ProcessDKG) public dkgProcess;

    mapping(bytes32 => ComplaintData) public complaints;

    mapping(bytes32 => uint256) public startAlrightTimestamp;

    mapping(bytes32 => mapping(uint256 => bytes32)) public hashedData;

    mapping(bytes32 => uint256) private _badNodes;

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

    modifier correctNode(bytes32 schainHash, uint256 nodeIndex) {
        (uint256 index, ) = checkAndReturnIndexInGroup(schainHash, nodeIndex, true);
        _;
    }

    modifier correctNodeWithoutRevert(bytes32 schainHash, uint256 nodeIndex) {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        if (!check) {
            emit ComplaintError("Node is not in this group");
        } else {
            _;
        }
    }

    modifier onlyNodeOwner(uint256 nodeIndex) {
        _checkMsgSenderIsNodeOwner(nodeIndex);
        _;
    }

    modifier refundGasBySchain(bytes32 schainHash, Context memory context) {
        uint256 gasTotal = gasleft();
        _;
        _refundGasBySchain(schainHash, gasTotal, context);
    }

    modifier refundGasByValidatorToSchain(bytes32 schainHash, Context memory context) {
        uint256 gasTotal = gasleft();
        _;
        _refundGasBySchain(schainHash, gasTotal, context);
        _refundGasByValidatorToSchain(schainHash);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

    function alright(bytes32 schainHash, uint256 fromNodeIndex)
        external
        override
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
        uint256 nodeIndex,
        ISkaleDKG.G2Point[] memory verificationVector,
        KeyShare[] memory secretKeyContribution
    )
        external
        override
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


    function complaintBadData(bytes32 schainHash, uint256 fromNodeIndex, uint256 toNodeIndex)
        external
        override
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
        uint256 fromNodeIndex,
        ISkaleDKG.G2Point[] memory verificationVector,
        ISkaleDKG.G2Point[] memory verificationVectorMultiplication,
        KeyShare[] memory secretKeyContribution
    )
        external
        override
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
            verificationVectorMultiplication,
            secretKeyContribution,
            contractManager,
            complaints,
            hashedData
        );
    }

    function complaint(bytes32 schainHash, uint256 fromNodeIndex, uint256 toNodeIndex)
        external
        override
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
        uint256 fromNodeIndex,
        uint256 secretNumber,
        ISkaleDKG.G2Point memory multipliedShare
    )
        external
        override
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
        IKeyStorage(contractManager.getContract("KeyStorage")).deleteKey(schainHash);
    }

    function setStartAlrightTimestamp(bytes32 schainHash) external override allow("SkaleDKG") {
        startAlrightTimestamp[schainHash] = block.timestamp;
    }

    function setBadNode(bytes32 schainHash, uint256 nodeIndex) external override allow("SkaleDKG") {
        _badNodes[schainHash] = nodeIndex;
    }

    function finalizeSlashing(bytes32 schainHash, uint256 badNode) external override allow("SkaleDKG") {
        INodeRotation nodeRotation = INodeRotation(contractManager.getContract("NodeRotation"));
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal")
        );
        emit BadGuy(badNode);
        emit FailedDKG(schainHash);

        schainsInternal.makeSchainNodesInvisible(schainHash);
        if (schainsInternal.isAnyFreeNode(schainHash)) {
            uint256 newNode = nodeRotation.rotateNode(
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
        IPunisher(contractManager.getPunisher()).slash(
            INodes(contractManager.getContract("Nodes")).getValidatorId(badNode),
            ISlashingTable(contractManager.getContract("SlashingTable")).getPenalty("FailedDKG")
        );
    }

    function getChannelStartedTime(bytes32 schainHash) external view override returns (uint256 timestamp) {
        return channels[schainHash].startedBlockTimestamp;
    }

    function getChannelStartedBlock(bytes32 schainHash) external view override returns (uint256 blockNumber) {
        return channels[schainHash].startedBlock;
    }

    function getNumberOfBroadcasted(bytes32 schainHash) external view override returns (uint256 amount) {
        return dkgProcess[schainHash].numberOfBroadcasted;
    }

    function getNumberOfCompleted(bytes32 schainHash) external view override returns (uint256 amount) {
        return dkgProcess[schainHash].numberOfCompleted;
    }

    function getTimeOfLastSuccessfulDKG(bytes32 schainHash) external view override returns (uint256 timestamp) {
        return lastSuccessfulDKG[schainHash];
    }

    function getComplaintData(
        bytes32 schainHash
    )
        external
        view
        override
        returns (uint256 sourceNode, uint256 targetNode)
    {
        return (complaints[schainHash].fromNodeToComplaint, complaints[schainHash].nodeToComplaint);
    }

    function getComplaintStartedTime(bytes32 schainHash) external view override returns (uint256 timestamp) {
        return complaints[schainHash].startComplaintBlockTimestamp;
    }

    function getAlrightStartedTime(bytes32 schainHash) external view override returns (uint256 timestamp) {
        return startAlrightTimestamp[schainHash];
    }

    /**
     * @dev Checks whether channel is opened.
     */
    function isChannelOpened(bytes32 schainHash) external view override returns (bool opened) {
        return channels[schainHash].active;
    }

    function isLastDKGSuccessful(bytes32 schainHash) external view override returns (bool successful) {
        return channels[schainHash].startedBlockTimestamp <= lastSuccessfulDKG[schainHash];
    }

    /**
     * @dev Checks whether broadcast is possible.
     */
    function isBroadcastPossible(bytes32 schainHash, uint256 nodeIndex) external view override returns (bool possible) {
        (uint256 index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            channels[schainHash].startedBlockTimestamp + _getComplaintTimeLimit() > block.timestamp &&
            !dkgProcess[schainHash].broadcasted[index];
    }

    /**
     * @dev Checks whether complaint is possible.
     */
    function isComplaintPossible(
        bytes32 schainHash,
        uint256 fromNodeIndex,
        uint256 toNodeIndex
    )
        external
        view
        override
        returns (bool possible)
    {
        (uint256 indexFrom, bool checkFrom) = checkAndReturnIndexInGroup(schainHash, fromNodeIndex, false);
        (uint256 indexTo, bool checkTo) = checkAndReturnIndexInGroup(schainHash, toNodeIndex, false);
        if (!checkFrom || !checkTo)
            return false;
        bool complaintSending = (
                complaints[schainHash].nodeToComplaint == type(uint256).max &&
                dkgProcess[schainHash].broadcasted[indexTo] &&
                !dkgProcess[schainHash].completed[indexFrom]
            ) ||
            (
                dkgProcess[schainHash].broadcasted[indexTo] &&
                complaints[schainHash].startComplaintBlockTimestamp + _getComplaintTimeLimit() <= block.timestamp &&
                complaints[schainHash].nodeToComplaint == toNodeIndex
            ) ||
            (
                !dkgProcess[schainHash].broadcasted[indexTo] &&
                complaints[schainHash].nodeToComplaint == type(uint256).max &&
                channels[schainHash].startedBlockTimestamp + _getComplaintTimeLimit() <= block.timestamp
            ) ||
            (
                complaints[schainHash].nodeToComplaint == type(uint256).max &&
                isEveryoneBroadcasted(schainHash) &&
                dkgProcess[schainHash].completed[indexFrom] &&
                !dkgProcess[schainHash].completed[indexTo] &&
                startAlrightTimestamp[schainHash] + _getComplaintTimeLimit() <= block.timestamp
            );
        return channels[schainHash].active &&
            dkgProcess[schainHash].broadcasted[indexFrom] &&
            _isNodeOwnedByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    /**
     * @dev Checks whether sending Alright response is possible.
     */
    function isAlrightPossible(bytes32 schainHash, uint256 nodeIndex) external view override returns (bool possible) {
        (uint256 index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            channels[schainHash].n == dkgProcess[schainHash].numberOfBroadcasted &&
            (complaints[schainHash].fromNodeToComplaint != nodeIndex ||
            (nodeIndex == 0 && complaints[schainHash].startComplaintBlockTimestamp == 0)) &&
            startAlrightTimestamp[schainHash] + _getComplaintTimeLimit() > block.timestamp &&
            !dkgProcess[schainHash].completed[index];
    }

    /**
     * @dev Checks whether sending a pre-response is possible.
     */
    function isPreResponsePossible(
        bytes32 schainHash,
        uint256 nodeIndex
    )
        external
        view
        override
        returns (bool possible)
    {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            complaints[schainHash].nodeToComplaint == nodeIndex &&
            complaints[schainHash].startComplaintBlockTimestamp + _getComplaintTimeLimit() > block.timestamp &&
            !complaints[schainHash].isResponse;
    }

    /**
     * @dev Checks whether sending a response is possible.
     */
    function isResponsePossible(bytes32 schainHash, uint256 nodeIndex) external view override returns (bool possible) {
        (, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return channels[schainHash].active &&
            check &&
            _isNodeOwnedByMessageSender(nodeIndex, msg.sender) &&
            complaints[schainHash].nodeToComplaint == nodeIndex &&
            complaints[schainHash].startComplaintBlockTimestamp + _getComplaintTimeLimit() > block.timestamp &&
            complaints[schainHash].isResponse;
    }

    function isNodeBroadcasted(
        bytes32 schainHash,
        uint256 nodeIndex
    )
        external
        view
        override
        returns (bool broadcasted)
    {
        (uint256 index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return check && dkgProcess[schainHash].broadcasted[index];
    }

     /**
     * @dev Checks whether all data has been received by node.
     */
    function isAllDataReceived(bytes32 schainHash, uint256 nodeIndex) external view override returns (bool received) {
        (uint256 index, bool check) = checkAndReturnIndexInGroup(schainHash, nodeIndex, false);
        return check && dkgProcess[schainHash].completed[index];
    }

    function hashData(
        KeyShare[] memory secretKeyContribution,
        ISkaleDKG.G2Point[] memory verificationVector
    )
        external
        pure
        override
        returns (bytes32 hash)
    {
        bytes memory data;
        for (uint256 i = 0; i < secretKeyContribution.length; i++) {
            data = abi.encodePacked(data, secretKeyContribution[i].publicKey, secretKeyContribution[i].share);
        }
        for (uint256 i = 0; i < verificationVector.length; i++) {
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

    function checkAndReturnIndexInGroup(
        bytes32 schainHash,
        uint256 nodeIndex,
        bool revertCheck
    )
        public
        view
        override
        returns (uint256 groupIndex, bool valid)
    {
        uint256 index = ISchainsInternal(contractManager.getContract("SchainsInternal"))
            .getNodeIndexInGroup(schainHash, nodeIndex);
        if (index >= channels[schainHash].n && revertCheck) {
            revert("Node is not in this group");
        }
        return (index, index < channels[schainHash].n);
    }

    function isEveryoneBroadcasted(bytes32 schainHash) public view override returns (bool broadcasted) {
        return channels[schainHash].n == dkgProcess[schainHash].numberOfBroadcasted;
    }

    function _refundGasBySchain(bytes32 schainHash, uint256 gasTotal, Context memory context) private {
        IWallets wallets = IWallets(payable(contractManager.getContract("Wallets")));
        bool isLastNode = channels[schainHash].n == dkgProcess[schainHash].numberOfCompleted;
        if (context.dkgFunction == DkgFunction.Alright && isLastNode) {
            wallets.refundGasBySchain(
                schainHash, payable(msg.sender), gasTotal - gasleft() + context.delta - 74800, context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Complaint && gasTotal - gasleft() > 14e5) {
            wallets.refundGasBySchain(
                schainHash, payable(msg.sender), gasTotal - gasleft() + context.delta - 341979, context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Complaint && gasTotal - gasleft() > 7e5) {
            wallets.refundGasBySchain(
                schainHash, payable(msg.sender), gasTotal - gasleft() + context.delta - 152214, context.isDebt
            );
        } else if (context.dkgFunction == DkgFunction.Response){
            wallets.refundGasBySchain(
                schainHash, payable(msg.sender), gasTotal - gasleft() - context.delta, context.isDebt
            );
        } else {
            wallets.refundGasBySchain(
                schainHash, payable(msg.sender), gasTotal - gasleft() + context.delta, context.isDebt
            );
        }
    }

    function _refundGasByValidatorToSchain(bytes32 schainHash) private {
        uint256 validatorId = INodes(contractManager.getContract("Nodes"))
         .getValidatorId(_badNodes[schainHash]);
         IWallets(payable(contractManager.getContract("Wallets")))
         .refundGasByValidatorToSchain(validatorId, schainHash);
        delete _badNodes[schainHash];
    }

    function _openChannel(bytes32 schainHash) private {
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal")
        );

        uint256 len = schainsInternal.getNumberOfNodesInGroup(schainHash);
        channels[schainHash].active = true;
        channels[schainHash].n = len;
        delete dkgProcess[schainHash].completed;
        delete dkgProcess[schainHash].broadcasted;
        dkgProcess[schainHash].broadcasted = new bool[](len);
        dkgProcess[schainHash].completed = new bool[](len);
        complaints[schainHash].fromNodeToComplaint = type(uint256).max;
        complaints[schainHash].nodeToComplaint = type(uint256).max;
        delete complaints[schainHash].startComplaintBlockTimestamp;
        delete dkgProcess[schainHash].numberOfBroadcasted;
        delete dkgProcess[schainHash].numberOfCompleted;
        channels[schainHash].startedBlockTimestamp = block.timestamp;
        channels[schainHash].startedBlock = block.number;
        IKeyStorage(contractManager.getContract("KeyStorage")).initPublicKeyInProgress(schainHash);

        emit ChannelOpened(schainHash);
    }

    function _isNodeOwnedByMessageSender(uint256 nodeIndex, address from) private view returns (bool owned) {
        return INodes(contractManager.getContract("Nodes")).isNodeExist(from, nodeIndex);
    }

    function _checkMsgSenderIsNodeOwner(uint256 nodeIndex) private view {
        require(_isNodeOwnedByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
    }

    function _getComplaintTimeLimit() private view returns (uint256 timeLimit) {
        return ConstantsHolder(contractManager.getConstantsHolder()).complaintTimeLimit();
    }
}
