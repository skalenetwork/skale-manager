// SPDX-License-Identifier: AGPL-3.0-only

/*
    DKR.sol - SKALE Manager
    Copyright (C) 2026-Present SKALE Labs
    @author Dmytro Stebaiev

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

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { IDecryption } from "@skalenetwork/skale-manager-interfaces/IDecryption.sol";
import { IECDH } from "@skalenetwork/skale-manager-interfaces/thirdparty/IECDH.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";
import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";

import { Permissions } from "./Permissions.sol";


type DkrId is uint256;

using {
    _dkrIdEquals as ==,
    _dkrIdNotEquals as !=
} for DkrId global;

function _dkrIdEquals(DkrId a, DkrId b) pure returns (bool result) {
    return DkrId.unwrap(a) == DkrId.unwrap(b);
}

function _dkrIdNotEquals(DkrId a, DkrId b) pure returns (bool result) {
    return DkrId.unwrap(a) != DkrId.unwrap(b);
}

interface IDKR {
    enum Status {
        SUCCESS,
        BROADCAST,
        ALRIGHT,
        COMPLAINT,
        FAILED
    }

    function start(
        uint256[] calldata dealers,
        uint256[] calldata receivers,
        uint256 threshold,
        DkrId previousDkr
    ) external returns (DkrId id);

    function broadcast(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution
    ) external;

    function alright(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id
    ) external;

    function complaintTimeout(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        uint256 accused
    ) external;

    function setBroadcastTimelimit(uint256 newBroadcastTimelimit) external;
}


/**
 * @title DKR
 * @dev Contains functions to manage distributed key re-sharing.
 */
contract DKR is Permissions, IDKR {
    using EnumerableSet for EnumerableSet.UintSet;

    struct Round {
        DkrId id;
        DkrId previousId;
        Status status;
        uint256 startedAt;
        EnumerableSet.UintSet dealers;
        EnumerableSet.UintSet receivers;
        mapping(uint256 => uint256) xCoordinate;
        uint256 threshold;
        EnumerableSet.UintSet broadcastNotSent;
        EnumerableSet.UintSet alrightNotSent;
        mapping(uint256 => bytes32) broadcastDataHash;
        uint256 complainant;
        uint256 accused;
        uint256 guiltyNode;
    }

    DkrId public constant NO_DKR_ID = DkrId.wrap(0);
    bytes32 public constant PARAMS_SETTER_ROLE =
        keccak256("PARAMS_SETTER_ROLE");

    mapping(DkrId dkr => Round round) private _rounds;

    /// @notice The ID of the most recently created DKR round
    DkrId public lastDkrId = NO_DKR_ID;

    uint256 public broadcastTimelimit;
    uint256 public alrightTimelimit;
    uint256 public complaintTimelimit;

    event BroadcastAndKeyShare(
        DkrId indexed id,
        uint256 indexed node,
        ISkaleDKG.G2Point[] verificationVector,
        ISkaleDKG.KeyShare[] secretKeyContribution
    );
    event AllDataReceived(
        DkrId indexed id,
        uint256 indexed node
    );
    event BadGuy(uint256 indexed node);
    event BroadcastTimelimitUpdated(
        uint256 indexed newBroadcastTimelimit,
        uint256 indexed oldBroadcastTimelimit
    );
    event AlrightTimelimitUpdated(
        uint256 indexed newAlrightTimelimit,
        uint256 indexed oldAlrightTimelimit
    );

    error DkrRoundDoesNotExist(DkrId id);
    error IncorrectNumberOfVerificationVectors(uint256 actual, uint256 expected);
    error IncorrectNumberOfSecretKeyShares(uint256 actual, uint256 expected);
    error BroadcastNotNeeded(DkrId id, uint256 node);
    error BroadcastIsNotSent(DkrId id, uint256 node);
    error AlrightNotNeeded(DkrId id, uint256 node);
    error NodeDoesNotExist(uint256 node);
    error NodeIsNotDealer(uint256 node);
    error NodeIsNotAccused(uint256 node);
    error AccessDenied(address caller);
    error DuplicatesFound();
    error NotBroadcastPhase(DkrId id);
    error NotAlrightPhase(DkrId id);
    error IncorrectPhase(DkrId id);
    error InvalidVerificationData();

    modifier onlyParamsSetter() {
        require(
            hasRole(PARAMS_SETTER_ROLE, msg.sender),
            AccessDenied(msg.sender)
        );
        _;
    }

    function initialize(
        address contractManagerAddress
    )
        public
        override
        initializer
    {
        Permissions.initialize(contractManagerAddress);
        broadcastTimelimit = 30 minutes;
        alrightTimelimit = 30 minutes;
    }

    function start(
        uint256[] calldata dealers,
        uint256[] calldata receivers,
        uint256 threshold,
        DkrId previousDkr
    )
        external
        allow("Rotation")
        override
        returns (DkrId id)
    {
        id = _reserveDkrId();
        Round storage round = _rounds[id];

        round.id = id;
        round.previousId = previousDkr;
        round.status = Status.BROADCAST;
        round.startedAt = block.timestamp;
        _fillEnumerableSet(round.dealers, dealers);
        _fillEnumerableSet(round.receivers, receivers);
        uint256 receiversLength = receivers.length;
        for (uint256 i = 0; i < receiversLength; ++i) {
            round.xCoordinate[receivers[i]] = i + 1;
        }
        round.threshold = threshold;
        _fillEnumerableSet(_rounds[id].broadcastNotSent, dealers);
        _fillEnumerableSet(_rounds[id].alrightNotSent, receivers);
        round.guiltyNode = 0;
    }

    function broadcast(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution
    )
        external
        override
    {
        Round storage round = _getRound(id);
        require(
            contractManager.getNodes().isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        require(round.status == Status.BROADCAST, NotBroadcastPhase(id));
        require(
            verificationVector.length == round.threshold,
            IncorrectNumberOfVerificationVectors(verificationVector.length, round.threshold)
        );
        require(
            secretKeyContribution.length == round.receivers.length(),
            IncorrectNumberOfSecretKeyShares(secretKeyContribution.length, round.receivers.length())
        );
        if (round.startedAt + broadcastTimelimit <= block.timestamp) {
            _failure(round, node);
            return;
        }

        require(
            round.broadcastNotSent.remove(node),
            BroadcastNotNeeded(id, node)
        );
        round.broadcastDataHash[node] = _hashBroadcastData(
            secretKeyContribution,
            verificationVector
        );
        if (round.broadcastNotSent.length() == 0) {
            _completeBroadcast(round);
        }

        emit BroadcastAndKeyShare(
            id,
            node,
            verificationVector,
            secretKeyContribution
        );
    }

    function alright(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id
    )
        external
        override
    {
        Round storage round = _getRound(id);
        require(
            contractManager.getNodes().isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        require(round.status == Status.ALRIGHT, NotAlrightPhase(id));

        if (round.startedAt + alrightTimelimit <= block.timestamp) {
            _failure(round, node);
            return;
        }

        require(
            round.alrightNotSent.remove(node),
            AlrightNotNeeded(id, node)
        );

        emit AllDataReceived(id, node);
        if (round.alrightNotSent.length() == 0) {
            _completeAlright(round);
        }
    }

    function complaintTimeout(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        uint256 accused
    )
        external
        override
    {
        Round storage round = _getRound(id);
        require(
            contractManager.getNodes().isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );

        if (round.status == Status.BROADCAST) {
            if (round.broadcastNotSent.contains(accused)) {
                _failure(round, node);
            } else if (round.startedAt + broadcastTimelimit <= block.timestamp) {
                _failure(round, accused);
            } else {
                _failure(round, node);
            }
        } else if (round.status == Status.ALRIGHT) {
            if (round.alrightNotSent.contains(accused)) {
                _failure(round, node);
            } else if (round.startedAt + alrightTimelimit <= block.timestamp) {
                _failure(round, accused);
            } else {
                _failure(round, node);
            }
        } else if (round.status == Status.COMPLAINT) {
            if (round.startedAt + complaintTimelimit <= block.timestamp) {
                _failure(round, round.accused);
            }
        } else {
            revert IncorrectPhase(id);
        }
    }

    function complaintSecret(
        uint256 node,
        DkrId id,
        uint256 accused
    )
     external
    {
        Round storage round = _getRound(id);
        require(
            contractManager.getNodes().isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        require(round.dealers.contains(accused), NodeIsNotDealer(accused));
        require(!round.broadcastNotSent.contains(accused), BroadcastIsNotSent(id, accused));
        require(round.status == Status.BROADCAST || round.status == Status.ALRIGHT, IncorrectPhase(id));

        round.status = Status.COMPLAINT;
        round.startedAt = block.timestamp;
        round.complainant = node;
        round.accused = accused;
    }

    function response(
        uint256 node,
        DkrId id,
        uint256 secretKey,
        ISkaleDKG.G2Point calldata multipliedSecret,
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        ISkaleDKG.G2Point[] calldata verificationVector
    )
        external
    {
        Round storage round = _getRound(id);
        INodes nodes = contractManager.getNodes();
        require(
            nodes.isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        require(round.accused == node, NodeIsNotAccused(node));
        require(round.status == Status.COMPLAINT, IncorrectPhase(id));
        require(
            round.broadcastDataHash[node] == _hashBroadcastData(secretKeyContribution, verificationVector),
            InvalidVerificationData()
        );

        uint256 secret = _decryptSecret(
            round,
            secretKeyContribution[round.xCoordinate[round.complainant] - 1],
            secretKey,
            nodes
        );
    }

    function setBroadcastTimelimit(uint256 newBroadcastTimelimit)
        external
        onlyParamsSetter
        override
    {
        emit BroadcastTimelimitUpdated(newBroadcastTimelimit, broadcastTimelimit);
        broadcastTimelimit = newBroadcastTimelimit;
    }

    // Private

    function _decryptSecret(
        Round storage round,
        ISkaleDKG.KeyShare calldata secretKeyContribution,
        uint256 secretKey,
        INodes nodes
    )
        private
        view
        returns (uint256 secret)
    {
        bytes32[2] memory complainantPublicKey = nodes.getNodePublicKey(round.complainant);
        ISkaleDKG.Fp2Point memory derivedKey;
        (derivedKey.a, derivedKey.b) = IECDH(contractManager.getContract("ECDH")).deriveKey(
            secretKey,
            uint256(complainantPublicKey[0]),
            uint256(complainantPublicKey[1])
        );
        bytes32 symmetricKey = bytes32(derivedKey.a);
        return IDecryption(contractManager.getContract("Decryption"))
            .decrypt(
                secretKeyContribution.share,
                sha256(abi.encodePacked(symmetricKey))
            );
    }

    function correspondsToKeyShare(
        uint256 secret,
        ISkaleDKG.KeyShare memory keyShare
    )
        private
        view
        returns (bool)
    {

    }

    function _fillEnumerableSet(
        EnumerableSet.UintSet storage set,
        uint256[] calldata array
    )
        private
    {
        uint256 length = array.length;
        for (uint256 i = 0; i < length; ++i) {
            require(
                set.add(array[i]),
                DuplicatesFound()
            );
        }
    }

    function _reserveDkrId() private returns (DkrId id) {
        id = DkrId.wrap(DkrId.unwrap(lastDkrId) + 1);
        lastDkrId = id;
    }

    function _failure(Round storage round, uint256 guiltyNode) private {
        round.status = Status.FAILED;
        round.guiltyNode = guiltyNode;
        emit BadGuy(guiltyNode);
    }

    function _completeBroadcast(Round storage round) private {
        round.startedAt = block.timestamp;
        round.status = Status.ALRIGHT;
    }

    function _completeAlright(Round storage round) private {
        round.status = Status.SUCCESS;
    }

    function _getRound(DkrId id) private view returns (Round storage round) {
        round = _rounds[id];
        require(round.id != NO_DKR_ID, DkrRoundDoesNotExist(id));
    }

    function _hashBroadcastData(
        ISkaleDKG.KeyShare[] calldata secretKeyContribution,
        ISkaleDKG.G2Point[] calldata verificationVector
    )
        private
        pure
        returns (bytes32 hash)
    {
        return keccak256(abi.encode(secretKeyContribution, verificationVector));
    }
}
