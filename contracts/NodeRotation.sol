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

pragma solidity 0.8.6;
pragma experimental ABIEncoderV2;

import "./interfaces/ISkaleDKG.sol";
import "./utils/Random.sol";

import "./ConstantsHolder.sol";
import "./Nodes.sol";
import "./Permissions.sol";
import "./SchainsInternal.sol";
import "./Schains.sol";


/**
 * @title NodeRotation
 * @dev This contract handles all node rotation functionality.
 */
contract NodeRotation is Permissions {
    using Random for Random.RandomGenerator;
    using SafeMath for uint;

    /**
     * nodeIndex - index of Node which is in process of rotation (left from schain)
     * newNodeIndex - index of Node which is rotated(added to schain)
     * freezeUntil - time till which Node should be turned on
     * rotationCounter - how many rotations were on this schain
     */
    struct Rotation {
        uint nodeIndex;
        uint newNodeIndex;
        uint freezeUntil;
        uint rotationCounter;
    }

    struct LeavingHistory {
        bytes32 schainIndex;
        uint finishedRotation;
    }

    mapping (bytes32 => Rotation) public rotations;

    mapping (uint => LeavingHistory[]) public leavingHistory;

    mapping (bytes32 => bool) public waitForNewNode;

    bytes32 public constant DEBUGGER_ROLE = keccak256("DEBUGGER_ROLE");

    /**
     * @dev Emitted when rotation delay skipped.
     */
    event RotationDelaySkipped(bytes32 indexed schainIndex);

    modifier onlyDebugger() {
        require(hasRole(DEBUGGER_ROLE, msg.sender), "DEBUGGER_ROLE is required");
        _;
    }

    /**
     * @dev Allows SkaleManager to remove, find new node, and rotate node from 
     * schain.
     * 
     * Requirements:
     * 
     * - A free node must exist.
     */
    function exitFromSchain(uint nodeIndex) external allow("SkaleManager") returns (bool, bool) {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32 schainHash = schainsInternal.getActiveSchain(nodeIndex);
        if (schainHash == bytes32(0)) {
            return (true, false);
        }
        _startRotation(schainHash, nodeIndex);
        rotateNode(nodeIndex, schainHash, true, false);
        return (schainsInternal.getActiveSchain(nodeIndex) == bytes32(0) ? true : false, true);
    }

    /**
     * @dev Allows SkaleManager contract to freeze all schains on a given node.
     */
    function freezeSchains(uint nodeIndex) external allow("SkaleManager") {
        bytes32[] memory schains = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        ).getSchainHashesForNode(nodeIndex);
        for (uint i = 0; i < schains.length; i++) {
            if (schains[i] != bytes32(0)) {
                require(
                    ISkaleDKG(contractManager.getContract("SkaleDKG")).isLastDKGSuccessful(schains[i]),
                    "DKG did not finish on Schain"
                );
                if (rotations[schains[i]].freezeUntil < block.timestamp) {
                    _startWaiting(schains[i], nodeIndex);
                } else {
                    if (rotations[schains[i]].nodeIndex != nodeIndex) {
                        revert("Occupied by rotation on Schain");
                    }
                }
            }
        }
    }

    /**
     * @dev Allows Schains contract to remove a rotation from an schain.
     */
    function removeRotation(bytes32 schainIndex) external allow("Schains") {
        delete rotations[schainIndex];
    }

    /**
     * @dev Allows Owner to immediately rotate an schain.
     */
    function skipRotationDelay(bytes32 schainIndex) external onlyDebugger {
        rotations[schainIndex].freezeUntil = block.timestamp;
        emit RotationDelaySkipped(schainIndex);
    }

    /**
     * @dev Returns rotation details for a given schain.
     */
    function getRotation(bytes32 schainIndex) external view returns (Rotation memory) {
        return rotations[schainIndex];
    }

    /**
     * @dev Returns leaving history for a given node.
     */
    function getLeavingHistory(uint nodeIndex) external view returns (LeavingHistory[] memory) {
        return leavingHistory[nodeIndex];
    }

    function isRotationInProgress(bytes32 schainIndex) external view returns (bool) {
        return rotations[schainIndex].freezeUntil >= block.timestamp && !waitForNewNode[schainIndex];
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
     * @dev Allows SkaleDKG and SkaleManager contracts to rotate a node from an
     * schain.
     */
    function rotateNode(
        uint nodeIndex,
        bytes32 schainHash,
        bool shouldDelay,
        bool isBadNode
    )
        public
        allowTwo("SkaleDKG", "SkaleManager")
        returns (uint newNode)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        schainsInternal.removeNodeFromSchain(nodeIndex, schainHash);
        if (!isBadNode) {
            schainsInternal.removeNodeFromExceptions(schainHash, nodeIndex);
        }
        newNode = selectNodeToGroup(schainHash);
        Nodes(contractManager.getContract("Nodes")).addSpaceToNode(
            nodeIndex,
            schainsInternal.getSchainsPartOfNode(schainHash)
        );
        _finishRotation(schainHash, nodeIndex, newNode, shouldDelay);
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
        allowThree("SkaleManager", "Schains", "SkaleDKG")
        returns (uint nodeIndex)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        require(schainsInternal.isSchainActive(schainHash), "Group is not active");
        uint8 space = schainsInternal.getSchainsPartOfNode(schainHash);
        schainsInternal.makeSchainNodesInvisible(schainHash);
        require(schainsInternal.isAnyFreeNode(schainHash), "No free Nodes available for rotation");
        Random.RandomGenerator memory randomGenerator = Random.createFromEntropy(
            abi.encodePacked(uint(blockhash(block.number - 1)), schainHash)
        );
        nodeIndex = nodes.getRandomNodeWithFreeSpace(space, randomGenerator);
        require(nodes.removeSpaceFromNode(nodeIndex, space), "Could not remove space from nodeIndex");
        schainsInternal.makeSchainNodesVisible(schainHash);
        schainsInternal.addSchainForNode(nodeIndex, schainHash);
        schainsInternal.setException(schainHash, nodeIndex);
        schainsInternal.setNodeInGroup(schainHash, nodeIndex);
    }


    /**
     * @dev Initiates rotation of a node from an schain.
     */
    function _startRotation(bytes32 schainIndex, uint nodeIndex) private {
        rotations[schainIndex].newNodeIndex = nodeIndex;
        waitForNewNode[schainIndex] = true;
    }

    function _startWaiting(bytes32 schainIndex, uint nodeIndex) private {
        ConstantsHolder constants = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        rotations[schainIndex].nodeIndex = nodeIndex;
        rotations[schainIndex].freezeUntil = block.timestamp.add(constants.rotationDelay());
    }

    /**
     * @dev Completes rotation of a node from an schain.
     */
    function _finishRotation(
        bytes32 schainIndex,
        uint nodeIndex,
        uint newNodeIndex,
        bool shouldDelay)
        private
    {
        leavingHistory[nodeIndex].push(
            LeavingHistory(
                schainIndex,
                shouldDelay ? block.timestamp.add(
                    ConstantsHolder(contractManager.getContract("ConstantsHolder")).rotationDelay()
                ) : block.timestamp
            )
        );
        rotations[schainIndex].newNodeIndex = newNodeIndex;
        rotations[schainIndex].rotationCounter++;
        delete waitForNewNode[schainIndex];
        ISkaleDKG(contractManager.getContract("SkaleDKG")).openChannel(schainIndex);
    }
}
