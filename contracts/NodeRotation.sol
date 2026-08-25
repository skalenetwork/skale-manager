// SPDX-License-Identifier: AGPL-3.0-only

/*
    NodeRotation.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
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

// cspell:words IDKR

pragma solidity 0.8.35;

import { EnumerableSet }
from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { IConstantsHolder } from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import { INodeRotation } from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { IRandom } from "@skalenetwork/skale-manager-interfaces/utils/IRandom.sol";
import { DkrId, IDKR, IDkrNodeRotation } from "./DKR.sol";

import { Permissions } from "./Permissions.sol";
import { Random } from "./utils/Random.sol";


interface ILegacySkaleDKG is ISkaleDKG {
    /// @notice Returns the hash committed by a group member during legacy DKG.
    /// @param schainHash Hash of the schain.
    /// @param indexInGroup Position of the member in the legacy DKG group.
    /// @return hash Hash of the broadcast data.
    function hashedData(
        bytes32 schainHash,
        uint256 indexInGroup
    ) external view returns (bytes32 hash);
}

/**
 * @title NodeRotation
 * @dev This contract handles all node rotation functionality.
 */
contract NodeRotation is Permissions, IDkrNodeRotation {
    using EnumerableSet for EnumerableSet.UintSet;
    using Random for IRandom.RandomGenerator;


    /**
     * nodeIndex - index of Node which is in process of rotation (left from schain)
     * newNodeIndex - index of Node which is rotated(added to schain)
     * freezeUntil - time till which Node should be turned on
     * rotationCounter - how many _rotations were on this schain
     * previousNodes - queue of nodeIndex -> previous nodeIndexes
     * newNodeIndexes - set of all newNodeIndexes for this schain
     */
    struct RotationWithPreviousNodes {
        uint256 nodeIndex;
        uint256 newNodeIndex;
        uint256 freezeUntil;
        uint256 rotationCounter;
        //    schainHash =>        nodeIndex => nodeIndex
        mapping (uint256 => uint256) previousNodes;
        EnumerableSet.UintSet newNodeIndexes;
        mapping (uint256 => uint256) indexInLeavingHistory;
        EnumerableSet.UintSet broadcastSenders;
        EnumerableSet.UintSet spareBroadcastSenders;
        DkrId lastSuccessfulDkrId;
        DkrId activeDkrId;
    }

    mapping (bytes32 schain => RotationWithPreviousNodes rotation) private _rotations;

    mapping (uint256 nodeIndex => INodeRotation.LeavingHistory[] history ) public leavingHistory;

    mapping (bytes32 schain => bool wait) public waitForNewNode;

    /// @notice Maps a DKR round to its schain.
    mapping (DkrId dkrId => bytes32 schainHash) public override schainForDkr;

    bytes32 public constant DEBUGGER_ROLE = keccak256("DEBUGGER_ROLE");

    /**
     * @dev Emitted when rotation delay skipped.
     */
    event RotationDelaySkipped(bytes32 indexed schainHash);

    error PreviousRotationIsNotComplete(bytes32 schainHash);
    error DebuggerRoleIsRequired(address account);
    error NoPreviousNode(bytes32 schainHash, uint256 node);
    error NoNodesToReplaceBadNode(bytes32 schainHash);
    error BroadcastSenderRemovalError(bytes32 schainHash, uint256 node);
    error BroadcastSenderIsAlreadyAdded(bytes32 schainHash, uint256 node);
    error SpareBroadcastSenderRemovalError(bytes32 schainHash, uint256 node);
    error SpareBroadcastSenderIsAlreadyAdded(bytes32 schainHash, uint256 node);
    error GroupsIsNotActive(bytes32 schainHash);
    error NoFreeNodes(bytes32 schainHash);
    error CouldNotRemoveSpaceFromNode(uint256 node);
    error NewNodeWasAlreadyAdded(bytes32 schainHash, uint256 node);
    error DKGDidNotFinish(bytes32 schainHash);
    error DKRDidNotFinish(bytes32 schainHash);
    error DkrIsNotActive(uint256 dkrId, bytes32 schainHash);
    error DkrIsNotFirstRound(uint256 dkrId, bytes32 schainHash);
    error NodeWasNotInPreviousDkg(bytes32 schainHash, uint256 node);
    error PreviousDkgIndexIsInvalid(bytes32 schainHash, uint256 node, uint256 indexInGroup);
    error OccupiedByRotation(bytes32 schainHash, uint256 node);

    modifier onlyDebugger() {
        require(hasRole(DEBUGGER_ROLE, msg.sender), DebuggerRoleIsRequired(msg.sender));
        _;
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
     * @dev Allows SkaleManager to remove, find new node, and rotate node from
     * schain.
     *
     * Requirements:
     *
     * - A free node must exist.
     */
    function exitFromSchain(
        uint256 nodeIndex
    )
        external
        override
        allow("SkaleManager")
        returns (bool contains, bool successful)
    {
        ISchainsInternal schainsInternal =
            ISchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32 schainHash = schainsInternal.getActiveSchain(nodeIndex);
        if (schainHash == bytes32(0)) {
            return (true, false);
        }
        _checkBeforeRotation(schainHash, nodeIndex);
        _startRotation(schainHash, nodeIndex, schainsInternal);
        _rotateNode(nodeIndex, schainHash, true, false);
        return (schainsInternal.getActiveSchain(nodeIndex) == bytes32(0) ? true : false, true);
    }

    /**
     * @dev Allows Nodes contract to freeze all schains on a given node.
     */
    function freezeSchains(uint256 nodeIndex) external override allow("Nodes") {
        bytes32[] memory schains = ISchainsInternal(
            contractManager.getContract("SchainsInternal")
        ).getActiveSchains(nodeIndex);
        uint256 length = schains.length;
        for (uint256 i = 0; i < length; ++i) {
            _checkBeforeRotation(schains[i], nodeIndex);
        }
    }

    /**
     * @dev Allows Schains contract to remove a rotation from an schain.
     */
    function removeRotation(bytes32 schainHash) external override allow("Schains") {
        delete _rotations[schainHash].nodeIndex;
        delete _rotations[schainHash].newNodeIndex;
        delete _rotations[schainHash].freezeUntil;
        delete _rotations[schainHash].rotationCounter;
        _rotations[schainHash].activeDkrId = DkrId.wrap(0);
        _rotations[schainHash].lastSuccessfulDkrId = DkrId.wrap(0);
        _clearSet(_rotations[schainHash].broadcastSenders);
        _clearSet(_rotations[schainHash].spareBroadcastSenders);
        delete waitForNewNode[schainHash];
    }

    /**
     * @dev Allows Owner to immediately rotate an schain.
     */
    function skipRotationDelay(bytes32 schainHash) external override onlyDebugger {
        _rotations[schainHash].freezeUntil = block.timestamp;
        emit RotationDelaySkipped(schainHash);
    }

    function finalizeRotation(bytes32 schain) external override allowTwo("SkaleDKG", "DKR") {
        _clearSet(_rotations[schain].broadcastSenders);
        _clearSet(_rotations[schain].spareBroadcastSenders);
        _rotations[schain].lastSuccessfulDkrId = _rotations[schain].activeDkrId;
        _rotations[schain].activeDkrId = DkrId.wrap(0);
    }

    function failDkr(uint256 dkrId, uint256 badNode) external override allow("DKR") {
        _rotateNode(
            badNode,
            _getSchainForActiveDkr(DkrId.wrap(dkrId)),
            false,
            true
        );
    }

    /**
     * @notice Verifies broadcast data inherited from the last legacy DKG round.
     * @param nextDkr ID of the DKR round consuming the legacy data.
     * @param indexInGroup Position of the broadcaster in the legacy DKG group.
     * @param secretKeyContribution Encrypted secret-key contributions.
     * @param verificationVector Verification vector published by the broadcaster.
     * @return valid Whether the supplied data matches the legacy DKG commitment.
     */
    function isValidData(
        uint256 nextDkr,
        uint256 indexInGroup,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        ISkaleDKG.G2Point[] calldata verificationVector
    )
        external
        view
        override
        returns (bool valid)
    {
        DkrId dkrId = DkrId.wrap(nextDkr);
        bytes32 schainHash = _getSchainForActiveDkr(dkrId);
        _requireFirstDkrRound(dkrId, schainHash);

        ILegacySkaleDKG skaleDKG = ILegacySkaleDKG(contractManager.getContract("SkaleDKG"));
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal")
        );

        // Ensure the committed data belongs to a successfully completed legacy DKG round.
        if (
            skaleDKG.getTimeOfLastSuccessfulDKG(schainHash) == 0 ||
            !skaleDKG.isLastDKGSuccessful(schainHash)
        ) {
            return false;
        }

        // Reject positions outside the participant slots recorded by legacy DKG.
        if (indexInGroup >= schainsInternal.getNumberOfNodesInGroup(schainHash)) {
            return false;
        }

        // Authenticate the supplied broadcast against its legacy DKG commitment.
        return skaleDKG.hashedData(schainHash, indexInGroup) ==
            skaleDKG.hashData(secretKeyContribution, verificationVector);
    }

    /**
     * @notice Returns a node's position in the legacy DKG group.
     * @param nextDkr ID of the first DKR round following legacy DKG.
     * @param nodeIndex ID of a dealer carried over from the legacy DKG group.
     * @return indexInGroup Position of the dealer in the legacy DKG group.
     */
    function getPreviousNodeIndex(
        uint256 nextDkr,
        uint256 nodeIndex
    )
        external
        view
        override
        returns (uint256 indexInGroup)
    {
        DkrId dkrId = DkrId.wrap(nextDkr);
        bytes32 schainHash = _getSchainForActiveDkr(dkrId);
        _requireFirstDkrRound(dkrId, schainHash);

        // Require the node to be a dealer inherited from the legacy DKG group.
        require(
            _rotations[schainHash].broadcastSenders.contains(nodeIndex),
            NodeWasNotInPreviousDkg(schainHash, nodeIndex)
        );

        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal")
        );
        indexInGroup = schainsInternal.getNodeIndexInGroup(schainHash, nodeIndex);

        // Ensure the preserved group slot belongs to the legacy DKG participant range.
        require(
            indexInGroup < schainsInternal.getNumberOfNodesInGroup(schainHash),
            PreviousDkgIndexIsInvalid(schainHash, nodeIndex, indexInGroup)
        );
    }

    /**
     * @dev Returns rotation details for a given schain.
     */
    function getRotation(
        bytes32 schainHash
    )
        external
        view
        override
        returns (INodeRotation.Rotation memory rotation)
    {
        return Rotation({
            nodeIndex: _rotations[schainHash].nodeIndex,
            newNodeIndex: _rotations[schainHash].newNodeIndex,
            freezeUntil: _rotations[schainHash].freezeUntil,
            rotationCounter: _rotations[schainHash].rotationCounter
        });
    }

    function getActiveDkrId(bytes32 schainHash)
        external
        view
        override
        returns (uint256 dkrId)
    {
        return DkrId.unwrap(_rotations[schainHash].activeDkrId);
    }

    function getLastSuccessfulDkrId(bytes32 schainHash)
        external
        view
        override
        returns (uint256 dkrId)
    {
        return DkrId.unwrap(_rotations[schainHash].lastSuccessfulDkrId);
    }

    /**
     * @dev Returns leaving history for a given node.
     */
    function getLeavingHistory(
        uint256 nodeIndex
    )
        external
        view
        override
        returns (INodeRotation.LeavingHistory[] memory history)
    {
        return leavingHistory[nodeIndex];
    }

    function isRotationInProgress(
        bytes32 schainHash
    )
        external
        view
        override
        returns (bool inProgress)
    {
        bool foundNewNode = isNewNodeFound(schainHash);
        return foundNewNode ?
            // The value is not a constant
            // so no ability to save some gas here
            // solhint-disable-next-line gas-strict-inequalities
            leavingHistory[_rotations[schainHash].nodeIndex][
                _rotations[schainHash].indexInLeavingHistory[_rotations[schainHash].nodeIndex]
            ].finishedRotation >= block.timestamp :
            // The value is not a constant
            // so no ability to save some gas here
            // solhint-disable-next-line gas-strict-inequalities
            _rotations[schainHash].freezeUntil >= block.timestamp;
    }


    function isSchainCreation(
        bytes32 schainHash
    )
        external
        view
        override
        returns (bool schainCreation)
    {
        return _areBroadcastSendersEmpty(schainHash);
    }


    function shouldSendBroadcast(
        bytes32 schainHash,
        uint256 node
    )
        external
        view
        override
        returns (bool shouldSend)
    {
        return _rotations[schainHash].broadcastSenders.contains(node);
    }

    /**
     * @dev Returns a previous node of the node in schain.
     * If there is no previous node for given node would return an error:
     * "No previous node"
     */
    function getPreviousNode(
        bytes32 schainHash,
        uint256 nodeIndex
    )
        external
        view
        override
        returns (uint256 node)
    {
        require(
            _rotations[schainHash].newNodeIndexes.contains(nodeIndex),
            NoPreviousNode(schainHash, nodeIndex)
        );
        return _rotations[schainHash].previousNodes[nodeIndex];
    }

    /**
     * @dev Allows SkaleDKG and SkaleManager contracts to rotate a node from an
     * schain.
     */
    function rotateNode(
        uint256 nodeIndex,
        bytes32 schainHash,
        bool shouldDelay,
        bool isBadNode
    )
        public
        override
        allowThree("SkaleDKG", "SkaleManager", "Schains")
        returns (uint256 newNode)
    {
        return _rotateNode(nodeIndex, schainHash, shouldDelay, isBadNode);
    }

    /**
     * @dev Allows SkaleManager, Schains, and SkaleDKG contracts to
     * pseudo-randomly select a new Node for an Schain.
     *
     * Requirements:
     *
     * - Schain is active.
     * - A free node already exists.
     * - Free space can be allocated from the node.
     */
    function selectNodeToGroup(bytes32 schainHash)
        public
        override
        allowThree("SkaleManager", "Schains", "SkaleDKG")
        returns (uint256 nodeIndex)
    {
        return _selectNodeToGroup(schainHash);
    }

    function isNewNodeFound(bytes32 schainHash) public view override returns (bool found) {
        return _rotations[schainHash]
                    .newNodeIndexes.contains(_rotations[schainHash].newNodeIndex) &&
               _rotations[schainHash]
                    .previousNodes[_rotations[schainHash].newNodeIndex] ==
                        _rotations[schainHash].nodeIndex;
    }

    function _rotateNode(
        uint256 nodeIndex,
        bytes32 schainHash,
        bool shouldDelay,
        bool isBadNode
    )
        private
        returns (uint256 newNode)
    {
        ISchainsInternal schainsInternal =
            ISchainsInternal(contractManager.getContract("SchainsInternal"));
        schainsInternal.removeNodeFromSchain(nodeIndex, schainHash);
        if (isBadNode) {
            if (_rotations[schainHash].broadcastSenders.contains(nodeIndex)) {
                require(
                    _rotations[schainHash].spareBroadcastSenders.length() != 0,
                    NoNodesToReplaceBadNode(schainHash)
                );
                require(
                    _rotations[schainHash].broadcastSenders.remove(nodeIndex),
                    BroadcastSenderRemovalError(schainHash, nodeIndex)
                );
                uint256 spareNode = _rotations[schainHash].spareBroadcastSenders.at(0);
                require(
                    _rotations[schainHash].broadcastSenders.add(spareNode),
                    BroadcastSenderIsAlreadyAdded(schainHash, spareNode)
                );
                require(
                    _rotations[schainHash].spareBroadcastSenders.remove(spareNode),
                    SpareBroadcastSenderRemovalError(schainHash, spareNode)
                );
            }
        } else {
            schainsInternal.removeNodeFromExceptions(schainHash, nodeIndex);
        }
        newNode = _selectNodeToGroup(schainHash);
        _finishRotation(schainHash, nodeIndex, newNode, shouldDelay);
    }

    function _selectNodeToGroup(bytes32 schainHash) private returns (uint256 nodeIndex) {
        ISchainsInternal schainsInternal =
            ISchainsInternal(contractManager.getContract("SchainsInternal"));
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        require(schainsInternal.isSchainActive(schainHash), GroupsIsNotActive(schainHash));
        uint8 space = schainsInternal.getSchainsPartOfNode(schainHash);
        schainsInternal.makeSchainNodesInvisible(schainHash);
        require(schainsInternal.isAnyFreeNode(schainHash), NoFreeNodes(schainHash));
        IRandom.RandomGenerator memory randomGenerator = Random.createFromEntropy(
            abi.encodePacked(uint256(blockhash(block.number - 1)), schainHash)
        );
        nodeIndex = nodes.getRandomNodeWithFreeSpace(space, randomGenerator);
        require(
            nodes.removeSpaceFromNode(nodeIndex, space),
            CouldNotRemoveSpaceFromNode(nodeIndex)
        );
        schainsInternal.makeSchainNodesVisible(schainHash);
        schainsInternal.addSchainForNode(nodes, nodeIndex, schainHash);
        schainsInternal.setException(schainHash, nodeIndex);
        schainsInternal.setNodeInGroup(schainHash, nodeIndex);
    }


    /**
     * @dev Initiates rotation of a node from an schain.
     */
    function _startRotation(
        bytes32 schainHash,
        uint256 nodeIndex,
        ISchainsInternal schainsInternal
    )
        private
    {
        require(
            _areBroadcastSendersEmpty(schainHash),
            PreviousRotationIsNotComplete(schainHash)
        );

        _rotations[schainHash].newNodeIndex = nodeIndex;
        waitForNewNode[schainHash] = true;
        uint256[] memory nodesInGroup = schainsInternal.getNodesInGroup(schainHash);
        uint256 groupSize = nodesInGroup.length;
        uint256 broadcastSendersNumber = _getT(groupSize);

        // Remove for block when upgrading to V3.B
        for (uint256 i = 0; i < groupSize; ++i) {
            if (nodesInGroup[i] == nodeIndex) {
                nodesInGroup[i] = nodesInGroup[groupSize - 1];
                break;
            }
        }
        for (uint256 i = 0; i < broadcastSendersNumber; ++i) {
            require(
                _rotations[schainHash].broadcastSenders.add(
                    nodesInGroup[i]
                ),
                BroadcastSenderIsAlreadyAdded(schainHash, nodesInGroup[i])
            );
        }
        // Remove -1 when upgrading to V3.B
        for (uint256 i = broadcastSendersNumber; i < groupSize - 1; ++i) {
            require(
                _rotations[schainHash].spareBroadcastSenders.add(
                    nodesInGroup[i]
                ),
                SpareBroadcastSenderIsAlreadyAdded(schainHash, nodesInGroup[i])
            );
        }
    }

    function _startWaiting(bytes32 schainHash, uint256 nodeIndex) private {
        IConstantsHolder constants = contractManager.getConstantsHolder();
        _rotations[schainHash].nodeIndex = nodeIndex;
        _rotations[schainHash].freezeUntil = block.timestamp + constants.rotationDelay();
    }

    /**
     * @dev Completes rotation of a node from an schain.
     */
    function _finishRotation(
        bytes32 schainHash,
        uint256 nodeIndex,
        uint256 newNodeIndex,
        bool shouldDelay
    )
        private
    {
        // During skaled config generation skale-admin relies on a fact that
        // for each pair of nodes swaps (rotations) the more new swap has bigger finish_ts value.

        // Also skale-admin supposes that
        // if the different between finish_ts is minimum possible (1 second)
        // the corresponding swap was cased by failed DKG and no proper keys were generated.

        uint256 finishTimestamp;
        if (shouldDelay) {
            finishTimestamp = block.timestamp +
                contractManager.getConstantsHolder().rotationDelay();
        } else {
            if(_rotations[schainHash].rotationCounter > 0) {
                uint256 previousRotatedNode =
                    _rotations[schainHash].previousNodes[_rotations[schainHash].newNodeIndex];
                uint256 previousRotationTimestamp = leavingHistory[previousRotatedNode][
                    _rotations[schainHash].indexInLeavingHistory[previousRotatedNode]
                ].finishedRotation;
                finishTimestamp = previousRotationTimestamp + 1;
            } else {
                finishTimestamp = block.timestamp;
            }
        }
        leavingHistory[nodeIndex].push(LeavingHistory({
            schainHash: schainHash,
            finishedRotation: finishTimestamp
        }));
        require(
            _rotations[schainHash].newNodeIndexes.add(newNodeIndex),
            NewNodeWasAlreadyAdded(schainHash, newNodeIndex)
        );
        _rotations[schainHash].nodeIndex = nodeIndex;
        _rotations[schainHash].newNodeIndex = newNodeIndex;
        ++_rotations[schainHash].rotationCounter;
        _rotations[schainHash].previousNodes[newNodeIndex] = nodeIndex;
        _rotations[schainHash].indexInLeavingHistory[nodeIndex] =
            leavingHistory[nodeIndex].length - 1;
        delete waitForNewNode[schainHash];

        _triggerKeyRotation(schainHash);
    }

    function _triggerKeyRotation(bytes32 schainHash) private {
        if (_areBroadcastSendersEmpty(schainHash)) {
            // First DKG is started after schain creation - "Edge case"
            ISkaleDKG(contractManager.getContract("SkaleDKG")).openChannel(schainHash);
        } else {
            // TODO: Double check if this can be optimized - for now should work
            // I think it's externally read twice in the entire process
            uint256[] memory receivers = ISchainsInternal(
                contractManager.getContract("SchainsInternal")
            ).getNodesInGroup(schainHash);

            DkrId dkrId = IDKR(
                contractManager.getContract("DKR")
            ).start(
                _rotations[schainHash].broadcastSenders.values(),
                receivers,
                _getT(receivers.length),
                _rotations[schainHash].lastSuccessfulDkrId
            );
            _rotations[schainHash].activeDkrId = dkrId;
            // The function start(...) does not do external calls
            // slither-disable-next-line reentrancy-benign
            schainForDkr[dkrId] = schainHash;
        }
    }

    function _checkBeforeRotation(bytes32 schainHash, uint256 nodeIndex) private {
        require(
            // Only checks the FIRST DKG after introduction of DKR
            ISkaleDKG(contractManager.getContract("SkaleDKG")).isLastDKGSuccessful(schainHash),
            DKGDidNotFinish(schainHash)
        );
        require(
            _rotations[schainHash].activeDkrId == DkrId.wrap(0), // Possibly check lastSuccessful
            DKRDidNotFinish(schainHash) // TODO new error
        );
        if (_rotations[schainHash].freezeUntil < block.timestamp) {
            _startWaiting(schainHash, nodeIndex);
        } else {
            require(
                _rotations[schainHash].nodeIndex == nodeIndex,
                OccupiedByRotation(schainHash, nodeIndex)
            );
        }
    }

    // TODO: remove this function
    // after migration to openzeppelin-contracts v5+
    function _clearSet(EnumerableSet.UintSet storage set) private {
        uint256 len = set.length();
        for (uint256 i = 0; i < len; ++i) {
            assert(set.remove(set.at(0)));
        }
    }


    function _areBroadcastSendersEmpty(bytes32 schainHash) private view returns (bool empty) {
        return _rotations[schainHash].broadcastSenders.length() == 0;
    }

    function _getSchainForActiveDkr(DkrId dkrId) private view returns (bytes32 schainHash) {
        schainHash = schainForDkr[dkrId];

        // Reject an unknown, unmapped, or stale DKR round.
        require(
            dkrId != DkrId.wrap(0) &&
                schainHash != bytes32(0) &&
                _rotations[schainHash].activeDkrId == dkrId,
            DkrIsNotActive(DkrId.unwrap(dkrId), schainHash)
        );
    }

    function _requireFirstDkrRound(DkrId dkrId, bytes32 schainHash) private view {
        // Legacy DKG data can only be consumed by the first DKR round.
        require(
            _rotations[schainHash].lastSuccessfulDkrId == DkrId.wrap(0),
            DkrIsNotFirstRound(DkrId.unwrap(dkrId), schainHash)
        );
    }

    function _getT(uint256 n) private pure returns (uint256 t) {
        return (n * 2 + 1) / 3;
    }
}
