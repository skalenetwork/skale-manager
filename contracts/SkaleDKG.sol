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

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;
import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/ISchainsFunctionalityInternal.sol";
import "./delegation/Punisher.sol";
import "./SlashingTable.sol";
import "./SchainsFunctionality.sol";
import "./SchainsFunctionalityInternal.sol";
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

    struct Channel {
        bool active;
        address dataAddress;
        bool[] broadcasted;
        uint numberOfBroadcasted;
        Fp2 publicKeyx;
        Fp2 publicKeyy;
        uint numberOfCompleted;
        bool[] completed;
        uint startedBlockTimestamp;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockTimestamp;
    }

    struct Fp2 {
        uint x;
        uint y;
    }

    struct BroadcastedData {
        bytes secretKeyContribution;
        bytes verificationVector;
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
        bytes verificationVector,
        bytes secretKeyContribution
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
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex),
            "Node is not in this group");
        _;
    }

    function openChannel(bytes32 groupIndex) external allowTwo("SchainsData", "MonitorsData") {
        require(!channels[groupIndex].active, "Channel already is created");
        
        GroupsData groupsData = GroupsData(msg.sender);

        channels[groupIndex].active = true;
        channels[groupIndex].dataAddress = address(groupsData);
        channels[groupIndex].broadcasted = new bool[](groupsData.getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].completed = new bool[](groupsData.getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].publicKeyy.x = 1;
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        channels[groupIndex].startedBlockTimestamp = block.timestamp;

        groupsData.setGroupFailedDKG(groupIndex);
        emit ChannelOpened(groupIndex);
    }

    function deleteChannel(bytes32 groupIndex) external allowTwo("SchainsData", "MonitorsData") {
        require(channels[groupIndex].active, "Channel is not created");
        delete channels[groupIndex];
    }

    function reopenChannel(bytes32 groupIndex) external allowTwo("SkaleDKG", "SchainsData") {
        GroupsData groupsData = GroupsData(channels[groupIndex].dataAddress);
        channels[groupIndex].active = true;

        delete channels[groupIndex].completed;
        for (uint i = 0; i < channels[groupIndex].broadcasted.length; i++) {
            delete _data[groupIndex][i];
        }
        delete channels[groupIndex].broadcasted;
        channels[groupIndex].broadcasted = new bool[](groupsData.getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].completed = new bool[](groupsData.getRecommendedNumberOfNodes(groupIndex));
        delete channels[groupIndex].publicKeyx.x;
        delete channels[groupIndex].publicKeyx.y;
        channels[groupIndex].publicKeyy.x = 1;
        delete channels[groupIndex].publicKeyy.y;
        channels[groupIndex].fromNodeToComplaint = uint(-1);
        channels[groupIndex].nodeToComplaint = uint(-1);
        delete channels[groupIndex].numberOfBroadcasted;
        delete channels[groupIndex].numberOfCompleted;
        delete channels[groupIndex].startComplaintBlockTimestamp;
        channels[groupIndex].startedBlockTimestamp = block.timestamp;
        IGroupsData(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
        emit ChannelOpened(groupIndex);
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes calldata verificationVector,
        bytes calldata secretKeyContribution
    )
        external
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {
        require(_isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        _isBroadcast(
            groupIndex,
            nodeIndex,
            secretKeyContribution,
            verificationVector
        );
        bytes32 vector;
        bytes32 vector1;
        bytes32 vector2;
        bytes32 vector3;
        assembly {
            vector := calldataload(add(4, 160))
            vector1 := calldataload(add(4, 192))
            vector2 := calldataload(add(4, 224))
            vector3 := calldataload(add(4, 256))
        }
        _adding(
            groupIndex,
            uint(vector),
            uint(vector1),
            uint(vector2),
            uint(vector3)
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
        bytes calldata multipliedShare
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
        uint numberOfParticipant = IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex);
        require(numberOfParticipant == channels[groupIndex].numberOfBroadcasted, "Still Broadcasting phase");
        require(!channels[groupIndex].completed[index], "Node is already alright");
        channels[groupIndex].completed[index] = true;
        channels[groupIndex].numberOfCompleted++;
        emit AllDataReceived(groupIndex, fromNodeIndex);
        if (channels[groupIndex].numberOfCompleted == numberOfParticipant) {
            IGroupsData(channels[groupIndex].dataAddress).setPublicKey(
                groupIndex,
                channels[groupIndex].publicKeyx.x,
                channels[groupIndex].publicKeyx.y,
                channels[groupIndex].publicKeyy.x,
                channels[groupIndex].publicKeyy.y
            );
            // delete channels[groupIndex];
            channels[groupIndex].active = false;
            emit SuccessfulDKG(groupIndex);
        }
    }

    function isChannelOpened(bytes32 groupIndex) external view returns (bool) {
        return channels[groupIndex].active;
    }

    function isBroadcastPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].active &&
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
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
            indexFrom < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            indexTo < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(fromNodeIndex, msg.sender) &&
            complaintSending;
    }

    function isAlrightPossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        GroupsData groupsData = GroupsData(channels[groupIndex].dataAddress);
        return channels[groupIndex].active &&
            index < groupsData.getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            groupsData.getNumberOfNodesInGroup(groupIndex) == channels[groupIndex].numberOfBroadcasted &&
            !channels[groupIndex].completed[index];
    }

    function isResponsePossible(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].active &&
            index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex) &&
            _isNodeByMessageSender(nodeIndex, msg.sender) &&
            channels[groupIndex].nodeToComplaint == nodeIndex;
    }

    function getBroadcastedData(bytes32 groupIndex, uint nodeIndex) external view returns (bytes memory, bytes memory) {
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

    function _finalizeSlashing(bytes32 groupIndex, uint badNode) internal {
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal")
        );
        SchainsFunctionality schainsFunctionality = SchainsFunctionality(
            _contractManager.getContract("SchainsFunctionality")
        );
        emit BadGuy(badNode);
        emit FailedDKG(groupIndex);

        address dataAddress = channels[groupIndex].dataAddress;
        this.reopenChannel(groupIndex);
        if (schainsFunctionalityInternal.isAnyFreeNode(groupIndex)) {
            uint newNode = schainsFunctionality.rotateNode(
                badNode,
                groupIndex
            );
            emit NewGuy(newNode);
        } else {
            schainsFunctionalityInternal.removeNodeFromSchain(
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
        bytes memory multipliedShare
    )
        internal
        view
        returns (bool)
    {
        uint index = _findNode(groupIndex, fromNodeIndex);
        uint secret = _decryptMessage(groupIndex, secretNumber);
        bytes memory verificationVector = _data[groupIndex][index].verificationVector;
        Fp2 memory valX = Fp2({x: 0, y: 0});
        Fp2 memory valY = Fp2({x: 1, y: 0});
        Fp2 memory tmpX = Fp2({x: 0, y: 0});
        Fp2 memory tmpY = Fp2({x: 1, y: 0});
        for (uint i = 0; i < verificationVector.length / 128; i++) {
            (tmpX, tmpY) = _loop(index, verificationVector, i);
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
        bytes memory publicKey = nodes.getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
        uint256 pkX;
        uint256 pkY;

        (pkX, pkY) = _bytesToPublicKey(publicKey);

        (pkX, pkY) = IECDH(ecdhAddress).deriveKey(secretNumber, pkX, pkY);

        key = bytes32(pkX);
    }

    function _decryptMessage(bytes32 groupIndex, uint secretNumber) internal view returns (uint) {
        address decryptionAddress = _contractManager.getContract("Decryption");

        bytes32 key = _getCommonPublicKey(groupIndex, secretNumber);

        // Decrypt secret key contribution
        bytes32 ciphertext;
        uint index = _findNode(groupIndex, channels[groupIndex].fromNodeToComplaint);
        uint indexOfNode = _findNode(groupIndex, channels[groupIndex].nodeToComplaint);
        bytes memory sc = _data[groupIndex][indexOfNode].secretKeyContribution;
        assembly {
            ciphertext := mload(add(sc, add(32, mul(index, 97))))
        }

        uint secret = IDecryption(decryptionAddress).decrypt(ciphertext, key);
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
        require(_isG2(Fp2({ x: x1, y: y1 }), Fp2({ x: x2, y: y2 })), "Incorrect G2 point");
        (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = _addG2(
            Fp2({ x: x1, y: y1 }),
            Fp2({ x: x2, y: y2 }),
            channels[groupIndex].publicKeyx,
            channels[groupIndex].publicKeyy
        );
    }

    function _isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes memory sc,
        bytes memory vv
    )
        internal
    {
        uint index = _findNode(groupIndex, nodeIndex);
        require(!channels[groupIndex].broadcasted[index], "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
        channels[groupIndex].numberOfBroadcasted++;
        _data[groupIndex][index] = BroadcastedData({
            secretKeyContribution: sc,
            verificationVector: vv
        });
    }

    function _isBroadcasted(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        uint index = _findNode(groupIndex, nodeIndex);
        return channels[groupIndex].broadcasted[index];
    }

    function _findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint) {
        uint[] memory nodesInGroup = IGroupsData(channels[groupIndex].dataAddress).getNodesInGroup(groupIndex);
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

    // Fp2 operations

    function _addFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        return Fp2({ x: addmod(a.x, b.x, _P), y: addmod(a.y, b.y, _P) });
    }

    function _scalarMulFp2(uint scalar, Fp2 memory a) internal pure returns (Fp2 memory) {
        return Fp2({ x: mulmod(scalar, a.x, _P), y: mulmod(scalar, a.y, _P) });
    }

    function _minusFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint first;
        uint second;
        if (a.x >= b.x) {
            first = addmod(a.x, _P.sub(b.x), _P);
        } else {
            first = _P.sub(addmod(b.x, _P.sub(a.x), _P));
        }
        if (a.y >= b.y) {
            second = addmod(a.y, _P.sub(b.y), _P);
        } else {
            second = _P.sub(addmod(b.y, _P.sub(a.y), _P));
        }
        return Fp2({ x: first, y: second });
    }

    function _mulFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint aA = mulmod(a.x, b.x, _P);
        uint bB = mulmod(a.y, b.y, _P);
        return Fp2({
            x: addmod(aA, mulmod(_P - 1, bB, _P), _P),
            y: addmod(mulmod(addmod(a.x, a.y, _P), addmod(b.x, b.y, _P), _P), _P.sub(addmod(aA, bB, _P)), _P)
        });
    }

    function _squaredFp2(Fp2 memory a) internal pure returns (Fp2 memory) {
        uint ab = mulmod(a.x, a.y, _P);
        uint mult = mulmod(addmod(a.x, a.y, _P), addmod(a.x, mulmod(_P - 1, a.y, _P), _P), _P);
        return Fp2({ x: mult, y: addmod(ab, ab, _P) });
    }

    function _inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {
        uint t0 = mulmod(a.x, a.x, _P);
        uint t1 = mulmod(a.y, a.y, _P);
        uint t2 = mulmod(_P - 1, t1, _P);
        if (t0 >= t2) {
            t2 = addmod(t0, _P.sub(t2), _P);
        } else {
            t2 = _P.sub(addmod(t2, _P.sub(t0), _P));
        }
        uint t3 = Precompiled.bigModExp(t2, _P - 2, _P);
        x.x = mulmod(a.x, t3, _P);
        x.y = _P.sub(mulmod(a.y, t3, _P));
    }

    // End of Fp2 operations

    function _isG1(uint x, uint y) internal pure returns (bool) {
        return mulmod(y, y, _P) == addmod(mulmod(mulmod(x, x, _P), x, _P), 3, _P);
    }

    function _isG2(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {
        if (_isG2Zero(x, y)) {
            return true;
        }
        Fp2 memory squaredY = _squaredFp2(y);
        Fp2 memory res = _minusFp2(_minusFp2(squaredY, _mulFp2(_squaredFp2(x), x)), Fp2({x: _TWISTBX, y: _TWISTBY}));
        return res.x == 0 && res.y == 0;
    }

    function _isG2Zero(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {
        return x.x == 0 && x.y == 0 && y.x == 1 && y.y == 0;
    }

    function _doubleG2(Fp2 memory x1, Fp2 memory y1) internal view returns (Fp2 memory x3, Fp2 memory y3) {
        if (_isG2Zero(x1, y1)) {
            x3 = x1;
            y3 = y1;
        } else {
            Fp2 memory s = _mulFp2(_scalarMulFp2(3, _squaredFp2(x1)), _inverseFp2(_scalarMulFp2(2, y1)));
            x3 = _minusFp2(_squaredFp2(s), _scalarMulFp2(2, x1));
            y3 = _addFp2(y1, _mulFp2(s, _minusFp2(x3, x1)));
            y3.x = _P.sub(y3.x % _P);
            y3.y = _P.sub(y3.y % _P);
        }
    }

    function _u1(Fp2 memory x1) internal pure returns (Fp2 memory) {
        return _mulFp2(x1, _squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function _u2(Fp2 memory x2) internal pure returns (Fp2 memory) {
        return _mulFp2(x2, _squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function _s1(Fp2 memory y1) internal pure returns (Fp2 memory) {
        return _mulFp2(y1, _mulFp2(Fp2({ x: 1, y: 0 }), _squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function _s2(Fp2 memory y2) internal pure returns (Fp2 memory) {
        return _mulFp2(y2, _mulFp2(Fp2({ x: 1, y: 0 }), _squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function _isEqual(
        Fp2 memory u1Value,
        Fp2 memory u2Value,
        Fp2 memory s1Value,
        Fp2 memory s2Value
    )
        internal
        pure
        returns (bool)
    {
        return (u1Value.x == u2Value.x && u1Value.y == u2Value.y && s1Value.x == s2Value.x && s1Value.y == s2Value.y);
    }

    function _addG2(
        Fp2 memory x1,
        Fp2 memory y1,
        Fp2 memory x2,
        Fp2 memory y2
    )
        internal
        view
        returns (
            Fp2 memory x3,
            Fp2 memory y3
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

        Fp2 memory s = _mulFp2(_minusFp2(y2, y1), _inverseFp2(_minusFp2(x2, x1)));
        x3 = _minusFp2(_squaredFp2(s), _addFp2(x1, x2));
        y3 = _addFp2(y1, _mulFp2(s, _minusFp2(x3, x1)));
        y3.x = _P.sub(y3.x % _P);
        y3.y = _P.sub(y3.y % _P);
    }

    function _mulG2(
        uint scalar,
        Fp2 memory x1,
        Fp2 memory y1
    )
        internal
        view
        returns (Fp2 memory x, Fp2 memory y)
    {
        uint step = scalar;
        x = Fp2({x: 0, y: 0});
        y = Fp2({x: 1, y: 0});
        Fp2 memory tmpX = x1;
        Fp2 memory tmpY = y1;
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

    function _loop(
        uint index,
        bytes memory verificationVector,
        uint loopIndex)
        internal view returns (Fp2 memory, Fp2 memory)
    {
        bytes32[4] memory vector;
        bytes32 vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(32, mul(loopIndex, 128))))
        }
        vector[0] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(64, mul(loopIndex, 128))))
        }
        vector[1] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(96, mul(loopIndex, 128))))
        }
        vector[2] = vector1;
        assembly {
            vector1 := mload(add(verificationVector, add(128, mul(loopIndex, 128))))
        }
        vector[3] = vector1;
        return _mulG2(
            Precompiled.bigModExp(index.add(1), loopIndex, _P),
            Fp2({x: uint(vector[1]), y: uint(vector[0])}),
            Fp2({x: uint(vector[3]), y: uint(vector[2])})
        );
    }

    function _checkDKGVerification(
        Fp2 memory valX,
        Fp2 memory valY,
        bytes memory multipliedShare)
        internal pure returns (bool)
    {
        Fp2 memory tmpX;
        Fp2 memory tmpY;
        (tmpX, tmpY) = _bytesToG2(multipliedShare);
        return valX.x == tmpX.y && valX.y == tmpX.x && valY.x == tmpY.y && valY.y == tmpY.x;
    }

    function _checkCorrectMultipliedShare(bytes memory multipliedShare, uint secret) internal view returns (bool) {
        Fp2 memory tmpX;
        Fp2 memory tmpY;
        (tmpX, tmpY) = _bytesToG2(multipliedShare);
        uint[3] memory inputToMul;
        uint[2] memory mulShare;
        inputToMul[0] = _G1A;
        inputToMul[1] = _G1B;
        inputToMul[2] = secret;
        bool success;
        assembly {
            success := staticcall(not(0), 7, inputToMul, 0x60, mulShare, 0x40)
        }
        require(success, "Multiplication failed");
        if (!(mulShare[0] == 0 && mulShare[1] == 0)) {
            mulShare[1] = _P.sub((mulShare[1] % _P));
        }

        require(_isG1(_G1A, _G1B), "G1.one not in G1");
        require(_isG1(mulShare[0], mulShare[1]), "mulShare not in G1");

        require(_isG2(Fp2({x: _G2A, y: _G2B}), Fp2({x: _G2C, y: _G2D})), "G2.one not in G2");
        require(_isG2(tmpX, tmpY), "tmp not in G2");

        uint[12] memory inputToPairing;
        inputToPairing[0] = mulShare[0];
        inputToPairing[1] = mulShare[1];
        inputToPairing[2] = _G2B;
        inputToPairing[3] = _G2A;
        inputToPairing[4] = _G2D;
        inputToPairing[5] = _G2C;
        inputToPairing[6] = _G1A;
        inputToPairing[7] = _G1B;
        inputToPairing[8] = tmpX.y;
        inputToPairing[9] = tmpX.x;
        inputToPairing[10] = tmpY.y;
        inputToPairing[11] = tmpY.x;
        uint[1] memory out;
        assembly {
            success := staticcall(not(0), 8, inputToPairing, mul(12, 0x20), out, 0x20)
        }
        require(success, "Pairing check failed");
        return out[0] != 0;
    }

    function _bytesToPublicKey(bytes memory someBytes) internal pure returns (uint x, uint y) {
        bytes32 pkX;
        bytes32 pkY;
        assembly {
            pkX := mload(add(someBytes, 32))
            pkY := mload(add(someBytes, 64))
        }

        x = uint(pkX);
        y = uint(pkY);
    }

    function _bytesToG2(bytes memory someBytes) internal pure returns (Fp2 memory x, Fp2 memory y) {
        bytes32 xa;
        bytes32 xb;
        bytes32 ya;
        bytes32 yb;
        assembly {
            xa := mload(add(someBytes, 32))
            xb := mload(add(someBytes, 64))
            ya := mload(add(someBytes, 96))
            yb := mload(add(someBytes, 128))
        }

        x = Fp2({x: uint(xa), y: uint(xb)});
        y = Fp2({x: uint(ya), y: uint(yb)});
    }
}
