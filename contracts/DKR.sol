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
import { IDecryption }   from "@skalenetwork/skale-manager-interfaces/IDecryption.sol";
import { INodeRotation } from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import { INodes }        from "@skalenetwork/skale-manager-interfaces/INodes.sol";
import { ISkaleDKG }     from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { IECDH }         from "@skalenetwork/skale-manager-interfaces/thirdparty/IECDH.sol";

import { Permissions }  from "./Permissions.sol";
import { G1Operations } from "./utils/fieldOperations/G1Operations.sol";
import { G2Operations } from "./utils/fieldOperations/G2Operations.sol";
import { Precompiled }  from "./utils/Precompiled.sol";


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

// TODO: move to @skalenetwork/skale-manager-interfaces
interface IDKR {
    enum Status {
        SUCCESS,
        BROADCAST,
        ALRIGHT,
        COMPLAINT_SECRET,
        COMPLAINT_FREE_TERM,
        FAILED
    }

    struct PublishedData {
        ISkaleDKG.G2Point[] verificationVector;
        ISkaleDKG.KeyShare[] secretKeyContribution;
    }

    struct SecretVerificationData {
        ISkaleDKG.G2Point multipliedSecret;
        ISkaleDKG.G2Point[] multipliedVerificationVector;
        PublishedData sent;
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

    function complaintSecret(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        uint256 accused
    ) external;

    function responseSecret(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        uint256 secretKey,
        SecretVerificationData calldata verificationData
    ) external;

    function complaintFreeTerm(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        uint256 accused
    ) external;

    function responseFreeTerm(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        PublishedData[] calldata previousRoundData,
        PublishedData calldata currentRoundData
    ) external;

    function setBroadcastTimelimit(uint256 newBroadcastTimelimit) external;
}

// TODO: move to @skalenetwork/skale-manager-interfaces
interface IDkrNodeRotation is INodeRotation {
    function failDkr(DkrId dkrId, uint256 badNode) external;
    function successDkr(DkrId dkrId) external;
    function getActiveDkrId(bytes32 schainHash) external view returns (uint256 dkrId);
    function getLastSuccessfulDkrId(bytes32 schainHash) external view returns (uint256 dkrId);
}


/**
 * @title DKR
 * @dev Contains functions to manage distributed key re-sharing.
 */
contract DKR is Permissions, IDKR {
    using EnumerableSet for EnumerableSet.UintSet;
    using G2Operations for ISkaleDKG.G2Point;

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
    DkrId public lastDkrId;

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
    error NodeIsNotReceiver(uint256 node);
    error NodeIsNotDealer(uint256 node);
    error NodeIsNotAccused(uint256 node);
    error AccessDenied(address caller);
    error DuplicatesFound();
    error NotBroadcastPhase(DkrId id);
    error NotAlrightPhase(DkrId id);
    error IncorrectPhase(DkrId id);
    error IncorrectTimeoutComplaint(DkrId id);
    error InvalidVerificationData();
    error ShareIsNotValid();
    error MulShareIsNotInG1();
    error ArithmeticError();

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
        complaintTimelimit = 30 minutes;
    }

    function start(
        uint256[] calldata dealers,
        uint256[] calldata receivers,
        uint256 threshold,
        DkrId previousDkr
    )
        external
        allow("NodeRotation")
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
        require(
            round.broadcastNotSent.remove(node),
            BroadcastNotNeeded(id, node)
        );
        if (round.startedAt + broadcastTimelimit <= block.timestamp) {
            _failure(round, node);
            return;
        }
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

        require(
            round.alrightNotSent.remove(node),
            AlrightNotNeeded(id, node)
        );
        if (round.startedAt + alrightTimelimit <= block.timestamp) {
            _failure(round, node);
            return;
        }

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
        // Allow only nodes in the round, but from the distributors only allow those who broadcasted
        require(round.receivers.contains(node), NodeIsNotReceiver(node));
        require(!round.broadcastNotSent.contains(node), BroadcastIsNotSent(id, node));

        if (round.status == Status.BROADCAST &&
            round.broadcastNotSent.contains(accused) &&
            round.startedAt + broadcastTimelimit <= block.timestamp
        ) {
            _failure(round, accused);
        } else if (round.status == Status.ALRIGHT &&
            round.alrightNotSent.contains(accused) &&
            round.startedAt + alrightTimelimit <= block.timestamp)
        {
            _failure(round, accused);
        } else if (
            (
                round.status == Status.COMPLAINT_SECRET ||
                round.status == Status.COMPLAINT_FREE_TERM
            ) &&
            round.startedAt + complaintTimelimit <= block.timestamp
        ) {
            _failure(round, round.accused);
        } else {
            revert IncorrectTimeoutComplaint(id);
        }
    }

    function complaintSecret(
        uint256 node,
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
        // TODO: Require the complainant to be a receiver and reject self-complaints.
        require(round.dealers.contains(accused), NodeIsNotDealer(accused));
        require(!round.broadcastNotSent.contains(accused), BroadcastIsNotSent(id, accused));
        require(
            round.status == Status.BROADCAST || round.status == Status.ALRIGHT,
            IncorrectPhase(id)
        );

        round.status = Status.COMPLAINT_SECRET;
        round.startedAt = block.timestamp;
        round.complainant = node;
        round.accused = accused;
    }

    function responseSecret(
        uint256 node,
        DkrId id,
        uint256 secretKey,
        SecretVerificationData calldata verificationData
    )
        external
        override
    {
        Round storage round = _getRound(id);
        INodes nodes = contractManager.getNodes();
        IECDH ecdh = IECDH(contractManager.getContract("ECDH"));
        require(
            nodes.isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        // TODO: Reject responses submitted after the complaint deadline.
        _verifyInputData({
            round: round,
            node: node,
            id: id,
            secretKey: secretKey,
            verificationData: verificationData,
            nodes: nodes,
            ecdh: ecdh
        });

        ISkaleDKG.KeyShare calldata keyShare =
            verificationData.sent.secretKeyContribution[round.xCoordinate[round.complainant] - 1];

        if (_isPublicKeyValid(keyShare.publicKey, secretKey, ecdh)) {
            _failure(round, node);
            return;
        }

        if(!verificationData.multipliedSecret.isEqual(
            _calculateSum(verificationData.multipliedVerificationVector))) {
            _failure(round, node);
        } else {
            _failure(round, round.complainant);
        }
    }

    function complaintFreeTerm(
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
        // TODO: Require the complainant to be a receiver and reject self-complaints.
        require(round.dealers.contains(accused), NodeIsNotDealer(accused));
        require(!round.broadcastNotSent.contains(accused), BroadcastIsNotSent(id, accused));
        require(
            round.status == Status.BROADCAST || round.status == Status.ALRIGHT,
            IncorrectPhase(id)
        );

        round.status = Status.COMPLAINT_FREE_TERM;
        round.startedAt = block.timestamp;
        round.complainant = node;
        round.accused = accused;
    }

    function responseFreeTerm(
        uint256 node, // TODO: remove after Nodes upgrade
        DkrId id,
        PublishedData[] calldata previousRoundData,
        PublishedData calldata currentRoundData
    )
        external
        override
    {
        Round storage round = _getRound(id);
        INodes nodes = contractManager.getNodes();
        INodeRotation nodeRotation = contractManager.getNodeRotation();
        require(
            nodes.isNodeExist(msg.sender, node),
            NodeDoesNotExist(node)
        );
        // TODO: Reject responses submitted after the complaint deadline.
        _verifyResponseFreeTermInputData({
            round: round,
            node: node,
            id: id,
            previousRoundData: previousRoundData,
            currentRoundData: currentRoundData,
            nodeRotation: nodeRotation
        });

        ISkaleDKG.G2Point memory globalVerificationVectorTerm =
            _getPreviousGlobalVerificationVectorTerm(
                round,
                previousRoundData,
                nodeRotation
            );

        if (currentRoundData.verificationVector[0].isEqual(globalVerificationVectorTerm)) {
            _failure(round, round.complainant);
        } else {
            _failure(round, node);
        }
    }

    function setBroadcastTimelimit(uint256 newBroadcastTimelimit)
        external
        onlyParamsSetter
        override
    {
        emit BroadcastTimelimitUpdated(newBroadcastTimelimit, broadcastTimelimit);
        broadcastTimelimit = newBroadcastTimelimit;
    }

    function _setSuccessfulDkr(DkrId id) internal {
        _completeAlright(_getRound(id));
    }

    function _getPreviousDkrId(DkrId id) internal view returns (DkrId previousId) {
        return _getRound(id).previousId;
    }

    // Private

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
        IDkrNodeRotation(
            contractManager.getContract("NodeRotation")
        ).failDkr(round.id, guiltyNode);
    }

    function _completeBroadcast(Round storage round) private {
        round.startedAt = block.timestamp;
        round.status = Status.ALRIGHT;
    }

    function _completeAlright(Round storage round) private {
        round.status = Status.SUCCESS;
        IDkrNodeRotation nodeRotation = IDkrNodeRotation(
            contractManager.getContract("NodeRotation")
        );
        nodeRotation.successDkr(round.id);
    }

    function _getPreviousGlobalVerificationVectorTerm(
        Round storage round,
        PublishedData[] calldata previousRoundData,
        INodeRotation nodeRotation
    )
        private
        view
        returns (ISkaleDKG.G2Point memory globalVerificationVectorTerm)
    {
        uint256 previousIndex;
        uint256 previousDealersNumber = previousRoundData.length;
        globalVerificationVectorTerm = G2Operations.getG2Zero();
        if (round.previousId != NO_DKR_ID) {
            Round storage previousRound = _getRound(round.previousId);
            previousIndex = previousRound.xCoordinate[round.accused] - 1;
            uint256[] memory previousXCoordinates = new uint256[](previousRound.dealers.length());
            for (uint256 i = 0; i < previousDealersNumber; ++i) {
                uint256 dealer = previousRound.dealers.at(i);
                previousXCoordinates[i] = previousRound.xCoordinate[dealer];
            }
            for (uint256 i = 0; i < previousDealersNumber; ++i) {
                // TODO: Use the previous dealer's stored x-coordinate here. The
                // enumerable-set position is not necessarily its round coordinate.
                uint256 dealerXCoordinate = i + 1;
                ISkaleDKG.G2Point memory component =
                    previousRoundData[i].verificationVector[previousIndex].scalarMul(
                        _lagrangeCoefficientAtZero(
                            dealerXCoordinate,
                            previousXCoordinates
                        )
                    );
                globalVerificationVectorTerm = globalVerificationVectorTerm.addG2(
                    component
                );
            }
        } else {
            previousIndex = nodeRotation.getPreviousNodeIndex(
                DkrId.unwrap(round.id),
                round.accused
            );
            for (uint256 i = 0; i < previousDealersNumber; ++i) {
                globalVerificationVectorTerm = globalVerificationVectorTerm.addG2(
                    previousRoundData[i].verificationVector[previousIndex]
                );
            }
        }
        return globalVerificationVectorTerm;
    }

    function _verifyInputData(
        Round storage round,
        uint256 node,
        DkrId id,
        uint256 secretKey,
        SecretVerificationData calldata verificationData,
        INodes nodes,
        IECDH ecdh
    )
        private
        view
    {
        require(round.accused == node, NodeIsNotAccused(node));
        require(round.status == Status.COMPLAINT_SECRET, IncorrectPhase(id));
        require(
            round.broadcastDataHash[node] == _hashBroadcastData(
                verificationData.sent.secretKeyContribution,
                verificationData.sent.verificationVector
            ),
            InvalidVerificationData()
        );
        require(
            _checkCorrectVectorMultiplication(
                round.xCoordinate[round.complainant] - 1,
                verificationData.sent.verificationVector,
                verificationData.multipliedVerificationVector
            ),
            InvalidVerificationData()
        );

        ISkaleDKG.KeyShare calldata keyShare =
            verificationData.sent.secretKeyContribution[round.xCoordinate[round.complainant] - 1];

        uint256 secret = _decryptSecret({
            round: round,
            secretKeyContribution: keyShare,
            secretKey: secretKey,
            ecdh: ecdh,
            nodes: nodes
        });

        require(
            _checkCorrectMultipliedShare(verificationData.multipliedSecret, secret),
            InvalidVerificationData()
        );
    }

    // TODO(DKR): Require the exact legacy participant count and index later-round
    // previousRoundData by dealer order rather than by receiver coordinate.
    function _verifyResponseFreeTermInputData(
        Round storage round,
        uint256 node,
        DkrId id,
        PublishedData[] calldata previousRoundData,
        PublishedData calldata currentRoundData,
        INodeRotation nodeRotation
    )
        private
        view
    {
        require(round.accused == node, NodeIsNotAccused(node));
        require(round.status == Status.COMPLAINT_FREE_TERM, IncorrectPhase(id));
        require(
            round.broadcastDataHash[node] == _hashBroadcastData(
                currentRoundData.secretKeyContribution,
                currentRoundData.verificationVector
            ),
            InvalidVerificationData()
        );
        uint256 previousDealersNumber = previousRoundData.length;
        if (round.previousId != NO_DKR_ID) {
            Round storage previousRound = _getRound(round.previousId);
            require(
                previousDealersNumber == previousRound.dealers.length(),
                InvalidVerificationData()
            );
            for (uint256 i = 0; i < previousDealersNumber; ++i) {
                uint256 dealer = previousRound.dealers.at(i);
                uint256 previousIndex = previousRound.xCoordinate[dealer] - 1;
                require(
                    previousRound.broadcastDataHash[dealer] == _hashBroadcastData(
                        previousRoundData[previousIndex].secretKeyContribution,
                        previousRoundData[previousIndex].verificationVector
                    ),
                    InvalidVerificationData()
                );
            }
        } else {
            for (uint256 index = 0; index < previousDealersNumber; ++index) {
                require(
                    nodeRotation.isValidData(
                        DkrId.unwrap(round.id),
                        index,
                        previousRoundData[index].secretKeyContribution,
                        previousRoundData[index].verificationVector
                    ),
                    InvalidVerificationData()
                );
            }
        }
    }

    function _calculateSum(
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication
    )
        private
        view
        returns (ISkaleDKG.G2Point memory result)
    {
        ISkaleDKG.G2Point memory value = G2Operations.getG2Zero();
        uint256 length = verificationVectorMultiplication.length;
        for (uint256 i = 0; i < length; ++i) {
            value = value.addG2(verificationVectorMultiplication[i]);
        }
        return value;
    }

    function _checkCorrectMultipliedShare(
        ISkaleDKG.G2Point memory multipliedShare,
        uint256 secret
    )
        private
        view
        returns (bool correct)
    {
        if (!multipliedShare.isG2()) {
            return false;
        }
        ISkaleDKG.G2Point memory tmp = multipliedShare;
        ISkaleDKG.Fp2Point memory g1 = G1Operations.getG1Generator();
        ISkaleDKG.Fp2Point memory share = ISkaleDKG.Fp2Point({a: 0, b: 0});
        (share.a, share.b) = Precompiled.bn256ScalarMul(g1.a, g1.b, secret);
        require(G1Operations.checkRange(share), ShareIsNotValid());
        share.b = G1Operations.negate(share.b);

        require(G1Operations.isG1(share), MulShareIsNotInG1());

        ISkaleDKG.G2Point memory g2 = G2Operations.getG2Generator();

        return
            Precompiled.bn256Pairing({
                x1: share.a,
                y1: share.b,
                a1: g2.x.b,
                b1: g2.x.a,
                c1: g2.y.b,
                d1: g2.y.a,
                x2: g1.a,
                y2: g1.b,
                a2: tmp.x.b,
                b2: tmp.x.a,
                c2: tmp.y.b,
                d2: tmp.y.a
            });
    }

    function _checkCorrectVectorMultiplication(
        uint256 indexOnSchain,
        ISkaleDKG.G2Point[] calldata verificationVector,
        ISkaleDKG.G2Point[] calldata verificationVectorMultiplication
    )
        private
        view
        returns (bool correct)
    {
        ISkaleDKG.Fp2Point memory value = G1Operations.getG1Generator();
        ISkaleDKG.Fp2Point memory tmp = G1Operations.getG1Generator();
        uint256 length = verificationVector.length;
        for (uint256 i = 0; i < length; ++i) {
            (tmp.a, tmp.b) = Precompiled.bn256ScalarMul(
                value.a,
                value.b,
                (indexOnSchain + 1) ** i
            );
            if (
                !_checkPairing(
                    tmp,
                    verificationVector[i],
                    verificationVectorMultiplication[i]
                )
            ) {
                return false;
            }
        }
        return true;
    }

    function _checkPairing(
        ISkaleDKG.Fp2Point memory g1Mul,
        ISkaleDKG.G2Point calldata verificationVector,
        ISkaleDKG.G2Point calldata verificationVectorMultiplication
    )
        private
        view
        returns (bool valid)
    {
        require(G1Operations.checkRange(g1Mul), "g1Mul is not valid");
        g1Mul.b = G1Operations.negate(g1Mul.b);
        ISkaleDKG.Fp2Point memory one = G1Operations.getG1Generator();
        return
            Precompiled.bn256Pairing({
                x1: one.a,
                y1: one.b,
                a1: verificationVectorMultiplication.x.b,
                b1: verificationVectorMultiplication.x.a,
                c1: verificationVectorMultiplication.y.b,
                d1: verificationVectorMultiplication.y.a,
                x2: g1Mul.a,
                y2: g1Mul.b,
                a2: verificationVector.x.b,
                b2: verificationVector.x.a,
                c2: verificationVector.y.b,
                d2: verificationVector.y.a
            });
    }

    function _decryptSecret(
        Round storage round,
        ISkaleDKG.KeyShare calldata secretKeyContribution,
        uint256 secretKey,
        IECDH ecdh,
        INodes nodes
    )
        private
        view
        returns (uint256 secret)
    {
        bytes32[2] memory complainantPublicKey = nodes.getNodePublicKey(round.complainant);
        ISkaleDKG.Fp2Point memory derivedKey = ISkaleDKG.Fp2Point({a: 0, b: 0});
        (derivedKey.a, derivedKey.b) = ecdh.deriveKey(
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

    function _getRound(DkrId id) private view returns (Round storage round) {
        round = _rounds[id];
        require(round.id != NO_DKR_ID, DkrRoundDoesNotExist(id));
    }

    function _lagrangeCoefficientAtZero(
        uint256 index,
        uint256[] memory xCoordinates
    )
        private
        view
        returns (uint256 coefficient)
    {
        uint256 p = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
        uint256 numerator = 1;
        uint256 denominator = 1;
        uint256 targetXCoordinate = index + 1;
        uint256 dealersNumber = xCoordinates.length;

        for (uint256 i = 0; i < dealersNumber; ++i) {
            if (xCoordinates[i] == targetXCoordinate) continue;

            uint256 xj = xCoordinates[i];
            numerator = mulmod(numerator, xj, p);
            uint256 diff;
            if (xj > targetXCoordinate) {
                diff = xj - targetXCoordinate;
            } else {
                diff = p - (targetXCoordinate - xj);
            }
            denominator = mulmod(denominator, diff, p);
        }

        return mulmod(
            numerator,
            _modInverse(denominator, p),
            p
        );
    }

    function _modInverse(uint256 a, uint256 p) private view returns (uint256 result) {
        require(a != 0, ArithmeticError());
        return Precompiled.bigModExp(a, p - 2, p);
    }

    function _isPublicKeyValid(
        bytes32[2] calldata publicKey,
        uint256 secretKey,
        IECDH ecdh
    )
        private
        pure
        returns (bool valid)
    {
        uint256 x;
        uint256 y;
        (x, y) = ecdh.publicKey(secretKey);
        return publicKey[0] == bytes32(x) && publicKey[1] == bytes32(y);
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
