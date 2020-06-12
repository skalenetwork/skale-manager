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

pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./Decryption.sol";
import "./Permissions.sol";
import "./delegation/Punisher.sol";
import "./SlashingTable.sol";
import "./Schains.sol";
import "./SchainsInternal.sol";
import "./utils/Precompiled.sol";

interface IECDH {
    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    )
        external
        pure
        returns (uint256, uint256);
}

interface IDecryption {
    function decrypt(bytes32 ciphertext, bytes32 key) external pure returns (uint256);
}


contract SkaleDKG is Permissions {

    struct Fp2Point {
        uint a;
        uint b;
    }

    struct G1Point {
        uint x;
        uint y;
    }

    struct G2Point {
        Fp2Point x;
        Fp2Point y;
    }

    struct Channel {
        bool active;
        address dataAddress;
        bool[] broadcasted;
        uint numberOfBroadcasted;
        G2Point publicKey;
        uint numberOfCompleted;
        bool[] completed;
        uint startedBlockTimestamp;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockTimestamp;
    }

    struct BroadcastedData {
        KeyShare[] secretKeyContribution;
        G2Point[] verificationVector;
    }

    struct KeyShare {
        bytes32[2] publicKey;
        bytes32 share;
    }

    uint constant private _P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint constant private _G2A = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint constant private _G2B = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint constant private _G2C = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint constant private _G2D = 4082367875863433681332203403145435568316851327593401208105741076214120093531;

    uint constant private _TWISTBX = 19485874751759354771024239261021720505790618469301721065564631296452457478373;
    uint constant private _TWISTBY = 266929791119991161246907387137283842545076965332900288569378510910307636690;

    uint constant private _G1A = 1;
    uint constant private _G1B = 2;

    mapping(bytes32 => Channel) public channels;
    mapping(bytes32 => mapping(uint => BroadcastedData)) private _data;

    event ChannelOpened(bytes32 groupIndex);

    event ChannelClosed(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 indexed groupIndex,
        uint indexed fromNode,
        G2Point[] verificationVector,
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
        uint index = _findNode(groupIndex, nodeIndex);
        require(
            index < SchainsInternal(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex),
            "Node is not in this group");
        _;
    }

    function openChannel(bytes32 groupIndex) external allowTwo("SchainsInternal", "Monitors") {
        require(!channels[groupIndex].active, "Channel already is created");
        
        SchainsInternal schainInternal = SchainsInternal(msg.sender);

        channels[groupIndex].active = true;
        channels[groupIndex].dataAddress = address(schainInternal);
        channels[groupIndex].broadcasted = new bool[](schainInternal.getNumberOfNodesInGroup(groupIndex));
        channels[groupIndex].completed = new bool[](schainInternal.getNumberOfNodesInGroup(groupIndex));
        channels[groupIndex].publicKey.y.a = 1;
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        channels[groupIndex].startedBlockTimestamp = block.timestamp;

        schainInternal.setGroupFailedDKG(groupIndex);
        emit ChannelOpened(groupIndex);
    }

    function deleteChannel(bytes32 groupIndex) external allowTwo("SchainsInternal", "Monitors") {
        require(channels[groupIndex].active, "Channel is not created");
        delete channels[groupIndex];
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        G2Point[] calldata verificationVector,
        KeyShare[] calldata secretKeyContribution
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {
        require(_isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        require(verificationVector.length >= 1, "VerificationVector is empty");
        
        _isBroadcast(
            groupIndex,
            nodeIndex,
            secretKeyContribution,
            verificationVector
        );
        _adding(
            groupIndex,
            verificationVector[0].x.a,
            verificationVector[0].x.b,
            verificationVector[0].y.a,
            verificationVector[0].y.b
        );
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
            revert("One complaint has already sent");
        } else if (broadcasted && channels[groupIndex].nodeToComplaint == toNodeIndex) {
            require(
                channels[groupIndex].startComplaintBlockTimestamp.add(1800) <= block.timestamp,
                "One more complaint rejected");
            // need to penalty Node - toNodeIndex
            _finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        } else if (!broadcasted) {
            // if node have not broadcasted params
            require(channels[groupIndex].startedBlockTimestamp.add(1800) <= block.timestamp, "Complaint rejected");
            // need to penalty Node - toNodeIndex
            _finalizeSlashing(groupIndex, channels[groupIndex].nodeToComplaint);
        }
    }

    function response(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        G2Point calldata multipliedShare
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
        uint index = _findNode(groupIndex, fromNodeIndex);
        uint numberOfParticipant = SchainsInternal(
            channels[groupIndex].dataAddress
        ).getNumberOfNodesInGroup(groupIndex);
        require(numberOfParticipant == channels[groupIndex].numberOfBroadcasted, "Still Broadcasting phase");
        require(!channels[groupIndex].completed[index], "Node is already alright");
        channels[groupIndex].completed[index] = true;
        channels[groupIndex].numberOfCompleted++;
        emit AllDataReceived(groupIndex, fromNodeIndex);
        if (channels[groupIndex].numberOfCompleted == numberOfParticipant) {
            SchainsInternal(channels[groupIndex].dataAddress).setPublicKey(
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

    function isChannelOpened(bytes32 groupIndex) external view returns (bool) {
        return channels[groupIndex].active;
    }

    function isBroadcastPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].active &&
            index < SchainsInternal(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            !channels[groupIndex].broadcasted[index];
    }

    function isComplaintPossible(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint toNodeIndex)
        external view returns (bool)
    {
        uint indexFrom = _findNode(groupIndex, fromNodeIndex);
        uint indexTo = _findNode(groupIndex, toNodeIndex);
        bool complaintSending = channels[groupIndex].nodeToComplaint == uint(-1) ||
            (
                channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].startComplaintBlockTimestamp.add(1800) <= block.timestamp &&
                channels[groupIndex].nodeToComplaint == toNodeIndex
            ) ||
            (
                !channels[groupIndex].broadcasted[indexTo] &&
                channels[groupIndex].nodeToComplaint == toNodeIndex &&
                channels[groupIndex].startedBlockTimestamp.add(1800) <= block.timestamp
            );
        return channels[groupIndex].active &&
            indexFrom < SchainsInternal(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            indexTo < SchainsInternal(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    function isAlrightPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        SchainsInternal schainsInternal = SchainsInternal(channels[groupIndex].dataAddress);
        return channels[groupIndex].active &&
            index < schainsInternal.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            schainsInternal.getNumberOfNodesInGroup(groupIndex) == channels[groupIndex].numberOfBroadcasted &&
            !channels[groupIndex].completed[index];
    }

    function isResponsePossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].active &&
            index < SchainsInternal(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            channels[groupIndex].nodeToComplaint == nodeIndex;
    }

    function getBroadcastedData(bytes32 groupIndex, uint nodeIndex)
        external view returns (KeyShare[] memory, G2Point[] memory)
    {
        uint index = _findNode(groupIndex, nodeIndex);
        return (_data[groupIndex][index].secretKeyContribution, _data[groupIndex][index].verificationVector);
    }

    function isAllDataReceived(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].completed[index];
    }

    function getComplaintData(bytes32 groupIndex) external view returns (uint, uint) {
        return (channels[groupIndex].fromNodeToComplaint, channels[groupIndex].nodeToComplaint);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

    function _reopenChannel(bytes32 groupIndex) internal {
        Groups groups = Groups(channels[groupIndex].dataAddress);
        channels[groupIndex].active = true;

        delete channels[groupIndex].completed;
        for (uint i = 0; i < channels[groupIndex].broadcasted.length; i++) {
            delete _data[groupIndex][i];
        }
        delete channels[groupIndex].broadcasted;
        channels[groupIndex].broadcasted = new bool[](groups.getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].completed = new bool[](groups.getRecommendedNumberOfNodes(groupIndex));
        delete channels[groupIndex].publicKey.x.a;
        delete channels[groupIndex].publicKey.x.b;
        channels[groupIndex].publicKey.y.a = 1;
        delete channels[groupIndex].publicKey.y.b;
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        delete channels[groupIndex].numberOfBroadcasted;
        delete channels[groupIndex].numberOfCompleted;
        delete channels[groupIndex].startComplaintBlockTimestamp;
        channels[groupIndex].startedBlockTimestamp = block.timestamp;
        Groups(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
        emit ChannelOpened(groupIndex);
    }

    function _finalizeSlashing(bytes32 groupIndex, uint badNode) internal {
        SchainsInternal schainsInternal = SchainsInternal(
            _contractManager.getContract("SchainsInternal")
        );
        Schains schains = Schains(
            _contractManager.getContract("Schains")
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

        Punisher punisher = Punisher(_contractManager.getContract("Punisher"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        SlashingTable slashingTable = SlashingTable(_contractManager.getContract("SlashingTable"));

        punisher.slash(nodes.getValidatorId(badNode), slashingTable.getPenalty("FailedDKG"));
    }

    function _verify(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        G2Point memory multipliedShare
    )
        internal
        view
        returns (bool)
    {
        uint index = _findNode(groupIndex, fromNodeIndex);
        uint secret = _decryptMessage(groupIndex, secretNumber);
        G2Point[] memory verificationVector = _data[groupIndex][index].verificationVector;
        Fp2Point memory valX = Fp2Point({a: 0, b: 0});
        Fp2Point memory valY = Fp2Point({a: 1, b: 0});
        Fp2Point memory tmpX = Fp2Point({a: 0, b: 0});
        Fp2Point memory tmpY = Fp2Point({a: 1, b: 0});
        for (uint i = 0; i < verificationVector.length; i++) {
            (tmpX, tmpY) = _mulG2(
                Precompiled.bigModExp(index.add(1), i, _P),
                _swapCoordinates(verificationVector[i].x),
                _swapCoordinates(verificationVector[i].y)
            );
            (valX, valY) = _addG2(
                tmpX,
                tmpY,
                valX,
                valY
            );
        }
        return _checkDKGVerification(valX, valY, multipliedShare) &&
            _checkCorrectMultipliedShare(multipliedShare, secret);
    }

    function _getCommonPublicKey(bytes32 groupIndex, uint256 secretNumber) internal view returns (bytes32 key) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        address ecdhAddress = _contractManager.getContract("ECDH");
        bytes32[2] memory publicKey = nodes.getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
        uint256 pkX = uint(publicKey[0]);
        uint256 pkY = uint(publicKey[1]);

        (pkX, pkY) = IECDH(ecdhAddress).deriveKey(secretNumber, pkX, pkY);

        key = bytes32(pkX);
    }

    function _decryptMessage(bytes32 groupIndex, uint secretNumber) internal view returns (uint) {
        Decryption decryption = Decryption(_contractManager.getContract("Decryption"));

        bytes32 key = _getCommonPublicKey(groupIndex, secretNumber);

        // Decrypt secret key contribution
        uint index = _findNode(groupIndex, channels[groupIndex].fromNodeToComplaint);
        uint indexOfNode = _findNode(groupIndex, channels[groupIndex].nodeToComplaint);
        uint secret = decryption.decrypt(_data[groupIndex][indexOfNode].secretKeyContribution[index].share, key);
        return secret;
    }

    function _adding(
        bytes32 groupIndex,
        uint x1,
        uint y1,
        uint x2,
        uint y2
    )
        internal
    {
        require(_isG2(Fp2Point({ a: x1, b: y1 }), Fp2Point({ a: x2, b: y2 })), "Incorrect G2 point");
        (channels[groupIndex].publicKey.x, channels[groupIndex].publicKey.y) = _addG2(
            Fp2Point({ a: x1, b: y1 }),
            Fp2Point({ a: x2, b: y2 }),
            channels[groupIndex].publicKey.x,
            channels[groupIndex].publicKey.y
        );
    }

    function _isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        KeyShare[] memory secretKeyContribution,
        G2Point[] memory verificationVector
    )
        internal
    {
        uint index = _findNode(groupIndex, nodeIndex);
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

    function _isBroadcasted(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].broadcasted[index];
    }

    function _findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint) {
        uint[] memory nodesInGroup = Groups(channels[groupIndex].dataAddress).getNodesInGroup(groupIndex);
        uint correctIndex = nodesInGroup.length;
        bool set = false;
        for (uint index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex && !set) {
                correctIndex = index;
                set = true;
            }
        }
        return correctIndex;
    }

    function _isNodeByMessageSender(uint nodeIndex, address from) internal view returns (bool) {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        return nodes.isNodeExist(from, nodeIndex);
    }

    // Fp2Point operations

    function _addFp2(Fp2Point memory value1, Fp2Point memory value2) internal pure returns (Fp2Point memory) {
        return Fp2Point({ a: addmod(value1.a, value2.a, _P), b: addmod(value1.b, value2.b, _P) });
    }

    function _scalarMulFp2(uint scalar, Fp2Point memory value) internal pure returns (Fp2Point memory) {
        return Fp2Point({ a: mulmod(scalar, value.a, _P), b: mulmod(scalar, value.b, _P) });
    }

    function _minusFp2(Fp2Point memory diminished, Fp2Point memory subtracted) internal pure
        returns (Fp2Point memory difference)
    {
        if (diminished.a >= subtracted.a) {
            difference.a = addmod(diminished.a, _P.sub(subtracted.a), _P);
        } else {
            difference.a = _P.sub(addmod(subtracted.a, _P.sub(diminished.a), _P));
        }
        if (diminished.b >= subtracted.b) {
            difference.b = addmod(diminished.b, _P.sub(subtracted.b), _P);
        } else {
            difference.b = _P.sub(addmod(subtracted.b, _P.sub(diminished.b), _P));
        }
    }

    function _mulFp2(Fp2Point memory value1, Fp2Point memory value2) internal pure returns (Fp2Point memory result) {
        Fp2Point memory point = Fp2Point({
            a: mulmod(value1.a, value2.a, _P),
            b: mulmod(value1.b, value2.b, _P)});
        result.a = addmod(
            point.a,
            mulmod(_P - 1, point.b, _P),
            _P);
        result.b = addmod(
            mulmod(
                addmod(value1.a, value1.b, _P),
                addmod(value2.a, value2.b, _P),
                _P),
            _P.sub(addmod(point.a, point.b, _P)),
            _P);
    }

    function _squaredFp2(Fp2Point memory value) internal pure returns (Fp2Point memory) {
        uint ab = mulmod(value.a, value.b, _P);
        uint mult = mulmod(addmod(value.a, value.b, _P), addmod(value.a, mulmod(_P - 1, value.b, _P), _P), _P);
        return Fp2Point({ a: mult, b: addmod(ab, ab, _P) });
    }

    function _inverseFp2(Fp2Point memory value) internal view returns (Fp2Point memory result) {
        uint t0 = mulmod(value.a, value.a, _P);
        uint t1 = mulmod(value.b, value.b, _P);
        uint t2 = mulmod(_P - 1, t1, _P);
        if (t0 >= t2) {
            t2 = addmod(t0, _P.sub(t2), _P);
        } else {
            t2 = _P.sub(addmod(t2, _P.sub(t0), _P));
        }
        uint t3 = Precompiled.bigModExp(t2, _P - 2, _P);
        result.a = mulmod(value.a, t3, _P);
        result.b = _P.sub(mulmod(value.b, t3, _P));
    }

    // End of Fp2Point operations

    function _isG1(uint x, uint y) internal pure returns (bool) {
        return mulmod(y, y, _P) == addmod(mulmod(mulmod(x, x, _P), x, _P), 3, _P);
    }

    function _isG2(Fp2Point memory x, Fp2Point memory y) internal pure returns (bool) {
        if (_isG2Zero(x, y)) {
            return true;
        }
        Fp2Point memory squaredY = _squaredFp2(y);
        Fp2Point memory res = _minusFp2(
            _minusFp2(squaredY, _mulFp2(_squaredFp2(x), x)),
            Fp2Point({a: _TWISTBX, b: _TWISTBY}));
        return res.a == 0 && res.b == 0;
    }

    function _isG2Zero(Fp2Point memory x, Fp2Point memory y) internal pure returns (bool) {
        return x.a == 0 && x.b == 0 && y.a == 1 && y.b == 0;
    }

    function _doubleG2(Fp2Point memory x1, Fp2Point memory y1) internal view
    returns (Fp2Point memory x3, Fp2Point memory y3)
    {
        if (_isG2Zero(x1, y1)) {
            x3 = x1;
            y3 = y1;
        } else {
            Fp2Point memory s = _mulFp2(_scalarMulFp2(3, _squaredFp2(x1)), _inverseFp2(_scalarMulFp2(2, y1)));
            x3 = _minusFp2(_squaredFp2(s), _scalarMulFp2(2, x1));
            y3 = _addFp2(y1, _mulFp2(s, _minusFp2(x3, x1)));
            y3.a = _P.sub(y3.a % _P);
            y3.b = _P.sub(y3.b % _P);
        }
    }

    function _u1(Fp2Point memory x1) internal pure returns (Fp2Point memory) {
        return _mulFp2(x1, _squaredFp2(Fp2Point({ a: 1, b: 0 })));
    }

    function _u2(Fp2Point memory x2) internal pure returns (Fp2Point memory) {
        return _mulFp2(x2, _squaredFp2(Fp2Point({ a: 1, b: 0 })));
    }

    function _s1(Fp2Point memory y1) internal pure returns (Fp2Point memory) {
        return _mulFp2(y1, _mulFp2(Fp2Point({ a: 1, b: 0 }), _squaredFp2(Fp2Point({ a: 1, b: 0 }))));
    }

    function _s2(Fp2Point memory y2) internal pure returns (Fp2Point memory) {
        return _mulFp2(y2, _mulFp2(Fp2Point({ a: 1, b: 0 }), _squaredFp2(Fp2Point({ a: 1, b: 0 }))));
    }

    function _isEqual(
        Fp2Point memory u1Value,
        Fp2Point memory u2Value,
        Fp2Point memory s1Value,
        Fp2Point memory s2Value
    )
        internal
        pure
        returns (bool)
    {
        return (u1Value.a == u2Value.a && u1Value.b == u2Value.b && s1Value.a == s2Value.a && s1Value.b == s2Value.b);
    }

    function _addG2(
        Fp2Point memory x1,
        Fp2Point memory y1,
        Fp2Point memory x2,
        Fp2Point memory y2
    )
        internal
        view
        returns (
            Fp2Point memory x3,
            Fp2Point memory y3
        )
    {
        if (_isG2Zero(x1, y1)) {
            return (x2, y2);
        }
        if (_isG2Zero(x2, y2)) {
            return (x1, y1);
        }
        if (
            _isEqual(
                _u1(x1),
                _u2(x2),
                _s1(y1),
                _s2(y2)
            )
        ) {
            (x3, y3) = _doubleG2(x1, y1);
        }

        Fp2Point memory s = _mulFp2(_minusFp2(y2, y1), _inverseFp2(_minusFp2(x2, x1)));
        x3 = _minusFp2(_squaredFp2(s), _addFp2(x1, x2));
        y3 = _addFp2(y1, _mulFp2(s, _minusFp2(x3, x1)));
        y3.a = _P.sub(y3.a % _P);
        y3.b = _P.sub(y3.b % _P);
    }

    function _mulG2(
        uint scalar,
        Fp2Point memory x1,
        Fp2Point memory y1
    )
        internal
        view
        returns (Fp2Point memory x, Fp2Point memory y)
    {
        uint step = scalar;
        x = Fp2Point({a: 0, b: 0});
        y = Fp2Point({a: 1, b: 0});
        Fp2Point memory tmpX = x1;
        Fp2Point memory tmpY = y1;
        while (step > 0) {
            if (step % 2 == 1) {
                (x, y) = _addG2(
                    x,
                    y,
                    tmpX,
                    tmpY
                );
            }
            (tmpX, tmpY) = _doubleG2(tmpX, tmpY);
            step >>= 1;
        }
    }

    function _checkDKGVerification(
        Fp2Point memory valX,
        Fp2Point memory valY,
        G2Point memory multipliedShare)
        internal pure returns (bool)
    {
        Fp2Point memory tmpX;
        Fp2Point memory tmpY;
        (tmpX, tmpY) = (multipliedShare.x, multipliedShare.y);
        return valX.a == tmpX.b && valX.b == tmpX.a && valY.a == tmpY.b && valY.b == tmpY.a;
    }

    function _checkCorrectMultipliedShare(G2Point memory multipliedShare, uint secret)
        internal view returns (bool)
    {
        Fp2Point memory tmpX;
        Fp2Point memory tmpY;
        (tmpX, tmpY) = (multipliedShare.x, multipliedShare.y);
        uint x;
        uint y;
        (x, y) = Precompiled.bn256ScalarMul(_G1A, _G1B, secret);
        if (!(x == 0 && y == 0)) {
            y = _P.sub((y % _P));
        }

        require(_isG1(_G1A, _G1B), "G1.one not in G1");
        require(_isG1(x, y), "mulShare not in G1");

        require(_isG2(Fp2Point({a: _G2A, b: _G2B}), Fp2Point({a: _G2C, b: _G2D})), "G2.one not in G2");
        require(_isG2(tmpX, tmpY), "tmp not in G2");

        return Precompiled.bn256Pairing(x, y, _G2B, _G2A, _G2D, _G2C, _G1A, _G1B, tmpX.b, tmpX.a, tmpY.b, tmpY.a);
    }

    function _swapCoordinates(Fp2Point memory value) internal pure returns (Fp2Point memory) {
        return Fp2Point({a: value.b, b: value.a});
    }
}
