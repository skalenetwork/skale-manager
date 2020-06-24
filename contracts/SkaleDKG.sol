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
import "./Decryption.sol";
import "./Permissions.sol";
import "./delegation/Punisher.sol";
import "./SlashingTable.sol";
import "./Schains.sol";
import "./SchainsInternal.sol";
import "./ECDH.sol";
import "./utils/Precompiled.sol";
import "./utils/FieldOperations.sol";


contract SkaleDKG is Permissions {
    using Fp2Operations for Fp2Operations.Fp2Point;
    using G2Operations for G2Operations.G2Point;

    struct Channel {
        bool active;
        bool[] broadcasted;
        uint numberOfBroadcasted;
        G2Operations.G2Point publicKey;
        G2Operations.G2Point[] publicValues;
        uint numberOfCompleted;
        bool[] completed;
        uint startedBlockTimestamp;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockTimestamp;
    }

    struct BroadcastedData {
        KeyShare[] secretKeyContribution;
        G2Operations.G2Point[] verificationVector;
    }

    struct KeyShare {
        bytes32[2] publicKey;
        bytes32 share;
    }

    uint public constant COMPLAINT_TIMELIMIT = 1800;

    mapping(bytes32 => Channel) public channels;
    mapping(bytes32 => mapping(uint => BroadcastedData)) private _data;

    event ChannelOpened(bytes32 groupIndex);

    event ChannelClosed(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 indexed groupIndex,
        uint indexed fromNode,
        G2Operations.G2Point[] verificationVector,
        KeyShare[] secretKeyContribution
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
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        G2Operations.G2Point[] calldata verificationVector,
        KeyShare[] calldata secretKeyContribution
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
        _adding(
            groupIndex,
            verificationVector[0]
        );
        _computePublicValues(groupIndex, verificationVector);
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
        bool verificationResult = _verify(
            groupIndex,
            fromNodeIndex,
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
            SchainsInternal(contractManager.getContract("SchainsInternal")).setPublicKey(
                groupIndex,
                channels[groupIndex].publicKey.x.a,
                channels[groupIndex].publicKey.x.b,
                channels[groupIndex].publicKey.y.a,
                channels[groupIndex].publicKey.y.b
            );
            // delete channels[groupIndex];
            channels[groupIndex].active = false;
            emit SuccessfulDKG(groupIndex);
        }
    }

    function reopenChannel(bytes32 groupIndex) external allow("SchainsInternal") {
        _reopenChannel(groupIndex);
    }

    function getBlsPublicKey(bytes32 groupIndex, uint nodeIndex)
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
        view
        returns (G2Operations.G2Point memory)
    {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        G2Operations.G2Point memory publicKey = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        G2Operations.G2Point memory tmp = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        G2Operations.G2Point[] memory publicValues = channels[groupIndex].publicValues;
        for (uint i = 0; i < publicValues.length; ++i) {
            G2Operations.G2Point memory publicValuesComponent = G2Operations.G2Point({
                x: _swapCoordinates(publicValues[i].x),
                y: _swapCoordinates(publicValues[i].y)
            });
            tmp = publicValuesComponent.mulG2(Precompiled.bigModExp(index.add(1), i, Fp2Operations.P));
            publicKey = tmp.addG2(publicKey);
        }
        return publicKey;
    }

    function isChannelOpened(bytes32 groupIndex) external view returns (bool) {
        return channels[groupIndex].active;
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

    function getBroadcastedData(bytes32 groupIndex, uint nodeIndex)
        external view returns (KeyShare[] memory, G2Operations.G2Point[] memory)
    {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        return (_data[groupIndex][index].secretKeyContribution, _data[groupIndex][index].verificationVector);
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
        channels[groupIndex].publicKey = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        delete channels[groupIndex].publicValues;
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        delete channels[groupIndex].numberOfBroadcasted;
        delete channels[groupIndex].numberOfCompleted;
        delete channels[groupIndex].startComplaintBlockTimestamp;
        channels[groupIndex].startedBlockTimestamp = now;

        schainsInternal.setGroupFailedDKG(groupIndex);
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

    function _verify(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        G2Operations.G2Point memory multipliedShare
    )
        private
        view
        returns (bool)
    {
        uint index = _nodeIndexInSchain(groupIndex, fromNodeIndex);
        uint secret = _decryptMessage(groupIndex, secretNumber);
        G2Operations.G2Point[] memory verificationVector = _data[groupIndex][index].verificationVector;
        G2Operations.G2Point memory value = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        G2Operations.G2Point memory tmp = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        for (uint i = 0; i < verificationVector.length; i++) {
            G2Operations.G2Point memory verificationVectorComponent = G2Operations.G2Point({
                x: _swapCoordinates(verificationVector[i].x),
                y: _swapCoordinates(verificationVector[i].y)
            });
            tmp = verificationVectorComponent.mulG2(Precompiled.bigModExp(index.add(1), i, Fp2Operations.P));
            value = tmp.addG2(value);
        }
        return _checkDKGVerification(value, multipliedShare) &&
            _checkCorrectMultipliedShare(multipliedShare, secret);
    }

    function _getCommonPublicKey(bytes32 groupIndex, uint256 secretNumber) private view returns (bytes32 key) {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        ECDH ecdh = ECDH(contractManager.getContract("ECDH"));
        bytes32[2] memory publicKey = nodes.getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
        uint256 pkX = uint(publicKey[0]);
        uint256 pkY = uint(publicKey[1]);

        (pkX, pkY) = ecdh.deriveKey(secretNumber, pkX, pkY);

        key = bytes32(pkX);
    }

    function _decryptMessage(bytes32 groupIndex, uint secretNumber) private view returns (uint) {
        Decryption decryption = Decryption(contractManager.getContract("Decryption"));

        bytes32 key = _getCommonPublicKey(groupIndex, secretNumber);

        // Decrypt secret key contribution
        uint index = _nodeIndexInSchain(groupIndex, channels[groupIndex].fromNodeToComplaint);
        uint indexOfNode = _nodeIndexInSchain(groupIndex, channels[groupIndex].nodeToComplaint);
        uint secret = decryption.decrypt(_data[groupIndex][indexOfNode].secretKeyContribution[index].share, key);
        return secret;
    }

    function _adding(
        bytes32 groupIndex,
        G2Operations.G2Point memory value
    )
        private
    {
        require(value.isG2(), "Incorrect g2 point");
        channels[groupIndex].publicKey = value.addG2(channels[groupIndex].publicKey);
    }

    function _computePublicValues(bytes32 groupIndex, G2Operations.G2Point[] memory verificationVector) private {
        for (uint i = 0; i < verificationVector.length; ++i) {
            if (channels[groupIndex].publicValues.length < verificationVector.length) {
                channels[groupIndex].publicValues.push(G2Operations.G2Point({
                    x: Fp2Operations.Fp2Point({
                        a: 0,
                        b: 0
                    }),
                    y: Fp2Operations.Fp2Point({
                        a: 1,
                        b: 0
                    })
                }));
            } else {
                channels[groupIndex].publicValues[i] = G2Operations.G2Point({
                    x: Fp2Operations.Fp2Point({
                        a: 0,
                        b: 0
                    }),
                    y: Fp2Operations.Fp2Point({
                        a: 1,
                        b: 0
                    })
                });
            }
        }
        for (uint i = 0; i < channels[groupIndex].publicValues.length; ++i) {
            for (uint j = 0; j < verificationVector.length; ++j) {
                require(verificationVector[j].isG2(), "Incorrect g2 point");
                channels[groupIndex].publicValues[i] = verificationVector[j].addG2(
                    channels[groupIndex].publicValues[i]
                );
            }
        }
    }

    function _isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        KeyShare[] memory secretKeyContribution,
        G2Operations.G2Point[] memory verificationVector
    )
        private
    {
        uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
        require(!channels[groupIndex].broadcasted[index], "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
        channels[groupIndex].numberOfBroadcasted++;

        for (uint i = 0; i < secretKeyContribution.length; ++i) {
            if (i < _data[groupIndex][index].secretKeyContribution.length) {
                _data[groupIndex][index].secretKeyContribution[i] = secretKeyContribution[i];
            } else {
                _data[groupIndex][index].secretKeyContribution.push(secretKeyContribution[i]);
            }
        }
        while (_data[groupIndex][index].secretKeyContribution.length > secretKeyContribution.length) {
            _data[groupIndex][index].secretKeyContribution.pop();
        }

        for (uint i = 0; i < verificationVector.length; ++i) {
            if (i < _data[groupIndex][index].verificationVector.length) {
                _data[groupIndex][index].verificationVector[i] = verificationVector[i];
            } else {
                _data[groupIndex][index].verificationVector.push(verificationVector[i]);
            }
        }
        while (_data[groupIndex][index].verificationVector.length > verificationVector.length) {
            _data[groupIndex][index].verificationVector.pop();
        }
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

    function _checkDKGVerification(
        G2Operations.G2Point memory value,
        G2Operations.G2Point memory multipliedShare)
        private pure returns (bool)
    {
        return value.x.a == multipliedShare.x.b &&
            value.x.b == multipliedShare.x.a &&
            value.y.a == multipliedShare.y.b &&
            value.y.b == multipliedShare.y.a;
    }

    function _checkCorrectMultipliedShare(G2Operations.G2Point memory multipliedShare, uint secret)
        private view returns (bool)
    {
        G2Operations.G2Point memory tmp = multipliedShare;
        Fp2Operations.Fp2Point memory g1 = G2Operations.getG1();
        Fp2Operations.Fp2Point memory share = Fp2Operations.Fp2Point({
            a: 0,
            b: 0
        });
        (share.a, share.b) = Precompiled.bn256ScalarMul(g1.a, g1.b, secret);
        if (!(share.a == 0 && share.b == 0)) {
            share.b = Fp2Operations.P.sub((share.b % Fp2Operations.P));
        }

        require(G2Operations.isG1(g1), "G1.one not in G1");
        require(G2Operations.isG1(share), "mulShare not in G1");

        G2Operations.G2Point memory g2 = G2Operations.getG2();
        require(G2Operations.isG2(g2), "g2.one not in g2");
        require(G2Operations.isG2(tmp), "tmp not in g2");

        return Precompiled.bn256Pairing(
            share.a, share.b,
            g2.x.b, g2.x.a, g2.y.b, g2.y.a,
            g1.a, g1.b,
            tmp.x.b, tmp.x.a, tmp.y.b, tmp.y.a);
    }

    function _swapCoordinates(
        Fp2Operations.Fp2Point memory value
    )
        private
        pure
        returns (Fp2Operations.Fp2Point memory)
    {
        return Fp2Operations.Fp2Point({a: value.b, b: value.a});
    }
}
