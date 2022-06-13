// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISkaleDKG.sol - SKALE Manager
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

pragma solidity >=0.6.10 <0.9.0;

interface ISkaleDKG {

    struct Fp2Point {
        uint a;
        uint b;
    }

    struct G2Point {
        Fp2Point x;
        Fp2Point y;
    }

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
        G2Point sumOfVerVec;
    }

    struct KeyShare {
        bytes32[2] publicKey;
        bytes32 share;
    }
    
    /**
     * @dev Emitted when a channel is opened.
     */
    event ChannelOpened(bytes32 schainHash);

    /**
     * @dev Emitted when a channel is closed.
     */
    event ChannelClosed(bytes32 schainHash);

    /**
     * @dev Emitted when a node broadcasts key share.
     */
    event BroadcastAndKeyShare(
        bytes32 indexed schainHash,
        uint indexed fromNode,
        G2Point[] verificationVector,
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
    event ComplaintSent(bytes32 indexed schainHash, uint indexed fromNodeIndex, uint indexed toNodeIndex);
    
    function alright(bytes32 schainHash, uint fromNodeIndex) external;
    function broadcast(
        bytes32 schainHash,
        uint nodeIndex,
        G2Point[] memory verificationVector,
        KeyShare[] memory secretKeyContribution
    )
        external;
    function complaintBadData(bytes32 schainHash, uint fromNodeIndex, uint toNodeIndex) external;
    function preResponse(
        bytes32 schainId,
        uint fromNodeIndex,
        G2Point[] memory verificationVector,
        G2Point[] memory verificationVectorMultiplication,
        KeyShare[] memory secretKeyContribution
    )
        external;
    function complaint(bytes32 schainHash, uint fromNodeIndex, uint toNodeIndex) external;
    function response(
        bytes32 schainHash,
        uint fromNodeIndex,
        uint secretNumber,
        G2Point memory multipliedShare
    )
        external;
    function openChannel(bytes32 schainHash) external;
    function deleteChannel(bytes32 schainHash) external;
    function setStartAlrightTimestamp(bytes32 schainHash) external;
    function setBadNode(bytes32 schainHash, uint nodeIndex) external;
    function finalizeSlashing(bytes32 schainHash, uint badNode) external;
    function getChannelStartedTime(bytes32 schainHash) external view returns (uint);
    function getChannelStartedBlock(bytes32 schainHash) external view returns (uint);
    function getNumberOfBroadcasted(bytes32 schainHash) external view returns (uint);
    function getNumberOfCompleted(bytes32 schainHash) external view returns (uint);
    function getTimeOfLastSuccessfulDKG(bytes32 schainHash) external view returns (uint);
    function getComplaintData(bytes32 schainHash) external view returns (uint, uint);
    function getComplaintStartedTime(bytes32 schainHash) external view returns (uint);
    function getAlrightStartedTime(bytes32 schainHash) external view returns (uint);
    function isChannelOpened(bytes32 schainHash) external view returns (bool);
    function isLastDKGSuccessful(bytes32 groupIndex) external view returns (bool);
    function isBroadcastPossible(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function isComplaintPossible(
        bytes32 schainHash,
        uint fromNodeIndex,
        uint toNodeIndex
    )
        external
        view
        returns (bool);
    function isAlrightPossible(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function isPreResponsePossible(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function isResponsePossible(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function isNodeBroadcasted(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function isAllDataReceived(bytes32 schainHash, uint nodeIndex) external view returns (bool);
    function checkAndReturnIndexInGroup(
        bytes32 schainHash,
        uint nodeIndex,
        bool revertCheck
    )
        external
        view
        returns (uint, bool);
    function isEveryoneBroadcasted(bytes32 schainHash) external view returns (bool);
    function hashData(
        KeyShare[] memory secretKeyContribution,
        G2Point[] memory verificationVector
    )
        external
        pure
        returns (bytes32);
}
