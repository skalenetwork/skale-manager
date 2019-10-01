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

pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;
import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";
// import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
// import "./ECDH.sol";
// import "./Decryption.sol";

interface IECDH {
    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    )
        external
        pure
        returns(uint256, uint256);
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
        uint startedBlockNumber;
        uint nodeToComplaint;
        uint fromNodeToComplaint;
        uint startComplaintBlockNumber;
    }

    struct Fp2 {
        uint x;
        uint y;
    }

    struct BroadcastedData {
        bytes secretKeyContribution;
        bytes verificationVector;
    }

    uint p = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    uint g2a = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint g2b = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint g2c = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint g2d = 8495653923123431417604973247489272438418190587263600148770280649306958101930;

    uint g1a = 1;
    uint g1b = 2;

    mapping(bytes32 => Channel) public channels;
    mapping(bytes32 => mapping(uint => BroadcastedData)) data;

    event ChannelOpened(bytes32 groupIndex);

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

    modifier correctGroup(bytes32 groupIndex) {
        require(channels[groupIndex].active, "Group is not created");
        _;
    }

    modifier correctNode(bytes32 groupIndex, uint nodeIndex) {
        uint index = findNode(groupIndex, nodeIndex);
        require(index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex), "Node is not in this group");
        _;
    }

    constructor(address contractsAddress) Permissions(contractsAddress) public {

    }

    function openChannel(bytes32 groupIndex, address dataAddress) public {
        require(dataAddress == msg.sender, "Does not allow");
        require(!channels[groupIndex].active, "Channel already is created");
        channels[groupIndex].active = true;
        channels[groupIndex].dataAddress = dataAddress;
        channels[groupIndex].broadcasted = new bool[](IGroupsData(channels[groupIndex].dataAddress).getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].completed = new bool[](IGroupsData(channels[groupIndex].dataAddress).getRecommendedNumberOfNodes(groupIndex));
        channels[groupIndex].nodeToComplaint = uint(-1);
        emit ChannelOpened(groupIndex);
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes memory verificationVector,
        bytes memory secretKeyContribution
    )
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {
        require(isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        isBroadcast(
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
            vector := mload(add(verificationVector, 32))
            vector1 := mload(add(verificationVector, 64))
            vector2 := mload(add(verificationVector, 96))
            vector3 := mload(add(verificationVector, 128))
        }
        adding(
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
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
        correctNode(groupIndex, toNodeIndex)
    {
        require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        if (isBroadcasted(groupIndex, toNodeIndex) && channels[groupIndex].nodeToComplaint == uint(-1)) {
            // need to wait a response from toNodeIndex
            channels[groupIndex].nodeToComplaint = toNodeIndex;
            channels[groupIndex].fromNodeToComplaint = fromNodeIndex;
            channels[groupIndex].startComplaintBlockNumber = block.number;
            emit ComplaintSent(groupIndex, fromNodeIndex, toNodeIndex);
        } else if (channels[groupIndex].nodeToComplaint != toNodeIndex) {
            revert("One complaint has already sent");
        } else if (channels[groupIndex].nodeToComplaint == toNodeIndex) {
            require(channels[groupIndex].startComplaintBlockNumber + 120 <= block.number, "One more complaint rejected");
            // need to penalty Node - toNodeIndex
            IGroupsData(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
            delete channels[groupIndex];
            emit FailedDKG(groupIndex);
        } else {
            // if node have not broadcasted params
            require(channels[groupIndex].startedBlockNumber + 120 <= block.number, "Complaint rejected");
            // need to penalty Node - toNodeIndex
            IGroupsData(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
            delete channels[groupIndex];
            emit FailedDKG(groupIndex);
        }
    }

    function response(
        bytes32 groupIndex,
        uint fromNodeIndex,
        uint secretNumber,
        bytes memory multipliedShare
    )
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {
        require(channels[groupIndex].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");

        uint secret = decryptMessage(groupIndex, secretNumber);

        // DKG verification(secret key contribution, verification vector)
        uint indexOfNode = findNode(groupIndex, fromNodeIndex);
        bytes memory verVec = data[groupIndex][indexOfNode].verificationVector;
        bool verificationResult = verify(
            indexOfNode,
            secret,
            multipliedShare,
            verVec
        );
        if (verificationResult) {
            //slash fromNodeToComplaint
            emit BadGuy(channels[groupIndex].fromNodeToComplaint);
        } else {
            //slash nodeToComplaint
            emit BadGuy(channels[groupIndex].nodeToComplaint);
        }
        // slash someone
        // not in 1.0
        // Fail DKG
        IGroupsData(channels[groupIndex].dataAddress).setGroupFailedDKG(groupIndex);
        emit FailedDKG(groupIndex);
        delete channels[groupIndex];
    }

    function allright(bytes32 groupIndex, uint fromNodeIndex)
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {
        require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        uint index = findNode(groupIndex, fromNodeIndex);
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
            delete channels[groupIndex];
            emit SuccessfulDKG(groupIndex);
        }
    }

    function verify(
        uint index,
        uint secret,
        bytes memory multipliedShare,
        bytes memory verificationVector
    )
        public
        returns (bool)
    {
        Fp2 memory valX = Fp2({x: 0, y: 0});
        Fp2 memory valY = Fp2({x: 1, y: 0});
        Fp2 memory tmpX = Fp2({x: 0, y: 0});
        Fp2 memory tmpY = Fp2({x: 1, y: 0});
        for (uint i = 0; i < verificationVector.length / 128; i++) {
            (tmpX, tmpY) = loop(index, verificationVector, i);
            addG2(
                tmpX,
                tmpY,
                valX,
                valY
            );
        }
        return checkDKGVerification(valX, valY, multipliedShare) && checkCorrectMultipliedShare(multipliedShare, secret);
    }

    function getCommonPublicKey(bytes32 groupIndex, uint256 secretNumber) public view returns (bytes32 key) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address ecdhAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("ECDH")));
        bytes memory publicKey = INodesData(nodesDataAddress).getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
        uint256 pkX;
        uint256 pkY;

        (pkX, pkY) = bytesToPublicKey(publicKey);

        (pkX, pkY) = IECDH(ecdhAddress).deriveKey(secretNumber, pkX, pkY);

        key = sha256(abi.encodePacked(pkX));
    }

    function hashed(bytes memory x) public pure returns (bytes32) {
        return sha256(abi.encodePacked(x));
    }

    function decryptMessage(bytes32 groupIndex, uint secretNumber) internal view returns (uint) {
        address decryptionAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Decryption")));

        bytes32 key = getCommonPublicKey(groupIndex, secretNumber);

        // Decrypt secret key contribution
        bytes32 ciphertext;
        uint index = findNode(groupIndex, channels[groupIndex].fromNodeToComplaint);
        uint indexOfNode = findNode(groupIndex, channels[groupIndex].nodeToComplaint);
        bytes memory sc = data[groupIndex][indexOfNode].secretKeyContribution;
        assembly {
            ciphertext := mload(add(sc, add(32, mul(index, 97))))
        }

        uint secret = IDecryption(decryptionAddress).decrypt(ciphertext, key);
        return secret;
    }

    function adding(
        bytes32 groupIndex,
        uint x1,
        uint y1,
        uint x2,
        uint y2
    )
        internal
    {
        if (
            channels[groupIndex].publicKeyx.x == 0 &&
            channels[groupIndex].publicKeyx.y == 0 &&
            channels[groupIndex].publicKeyy.x == 0 &&
            channels[groupIndex].publicKeyy.y == 0
        ) {
            channels[groupIndex].publicKeyx = Fp2({ x: x1, y: y1 });
            channels[groupIndex].publicKeyy = Fp2({ x: x2, y: y2 });
        } else {
            Fp2 memory a = Fp2({ x: x1, y: y1 });
            Fp2 memory b = Fp2({ x: x2, y: y2 });
            (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = addG2(
                a,
                b,
                channels[groupIndex].publicKeyx,
                channels[groupIndex].publicKeyy
            );
        }
    }

    function isBroadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes memory sc,
        bytes memory vv
    )
        internal
    {
        uint index = findNode(groupIndex, nodeIndex);
        require(channels[groupIndex].broadcasted[index] == false, "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
        channels[groupIndex].numberOfBroadcasted++;
        data[groupIndex][index] = BroadcastedData({
            secretKeyContribution: sc,
            verificationVector: vv
        });
    }

    function isBroadcasted(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        uint index = findNode(groupIndex, nodeIndex);
        return channels[groupIndex].broadcasted[index];
    }

    function findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint) {
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

    function isNodeByMessageSender(uint nodeIndex, address from) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        return INodesData(nodesDataAddress).isNodeExist(from, nodeIndex);
    }

    // Fp2 operations

    function addFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint pp = p;
        return Fp2({ x: addmod(a.x, b.x, pp), y: addmod(a.y, b.y, pp) });
    }

    function scalarMulFp2(uint scalar, Fp2 memory a) internal view returns (Fp2 memory) {
        uint pp = p;
        return Fp2({ x: mulmod(scalar, a.x, pp), y: mulmod(scalar, a.y, pp) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint first;
        uint second;
        uint pp = p;
        if (a.x >= b.x) {
            first = addmod(a.x, pp - b.x, pp);
        } else {
            first = pp - addmod(b.x, pp - a.x, pp);
        }
        if (a.y >= b.y) {
            second = addmod(a.y, pp - b.y, pp);
        } else {
            second = pp - addmod(b.y, pp - a.y, pp);
        }
        return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint pp = p;
        uint aA = mulmod(a.x, b.x, pp);
        uint bB = mulmod(a.y, b.y, pp);
        return Fp2({
            x: addmod(aA, mulmod(pp - 1, bB, pp), pp),
            y: addmod(mulmod(addmod(a.x, a.y, pp), addmod(b.x, b.y, pp), pp), pp - addmod(aA, bB, pp), pp)
        });
    }

    function squaredFp2(Fp2 memory a) internal view returns (Fp2 memory) {
        uint pp = p;
        uint ab = mulmod(a.x, a.y, pp);
        uint mult = mulmod(addmod(a.x, a.y, pp), addmod(a.x, mulmod(pp - 1, a.y, pp), pp), pp);
        return Fp2({ x: mult, y: addmod(ab, ab, pp) });
    }

    function inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {
        uint pp = p;
        uint t0 = mulmod(a.x, a.x, pp);
        uint t1 = mulmod(a.y, a.y, pp);
        uint t2 = mulmod(pp - 1, t1, pp);
        if (t0 >= t2) {
            t2 = addmod(t0, pp - t2, pp);
        } else {
            t2 = pp - addmod(t2, pp - t0, pp);
        }
        uint t3 = binstep(t2, pp - 2); // use bigModExp here
        x.x = mulmod(a.x, t3, pp);
        x.y = pp - mulmod(a.y, t3, pp);
    }

    // End of Fp2 operations

    function isG1(uint x, uint y) internal view returns (bool) {
        uint pp = p;
        return mulmod(y, y, pp) == addmod(mulmod(mulmod(x, x, pp), x, pp), 3, pp);
    }

    function isG2(Fp2 memory x, Fp2 memory y) internal view returns (bool) {
        Fp2 memory squaredY = squaredFp2(y);
        Fp2 memory funcX = addFp2(mulFp2(squaredFp2(x), x), scalarMulFp2(3, inverseFp2(Fp2({x: 1, y: 9}))));
        return squaredY.x == funcX.x && squaredY.y == funcX.y;
    }

    function isG2Zero(Fp2 memory x, Fp2 memory y) internal pure returns (bool) {
        return x.x == 0 && x.y == 0 && y.x == 1 && y.y == 0;
    }

    function doubleG2(Fp2 memory x1, Fp2 memory y1) internal view returns (Fp2 memory x3, Fp2 memory y3) {
        if (isG2Zero(x1, y1)) {
            x3 = x1;
            y3 = y1;
        } else {
            Fp2 memory s = mulFp2(scalarMulFp2(3, squaredFp2(x1)), inverseFp2(scalarMulFp2(2, y1)));
            x3 = minusFp2(squaredFp2(s), scalarMulFp2(2, x1));
            y3 = addFp2(y1, mulFp2(s, minusFp2(x3, x1)));
            uint pp = p;
            y3.x = pp - (y3.x % pp);
            y3.y = pp - (y3.y % pp);
        }
    }

    function u1(Fp2 memory x1) internal view returns (Fp2 memory) {
        return mulFp2(x1, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function u2(Fp2 memory x2) internal view returns (Fp2 memory) {
        return mulFp2(x2, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function s1(Fp2 memory y1) internal view returns (Fp2 memory) {
        return mulFp2(y1, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function s2(Fp2 memory y2) internal view returns (Fp2 memory) {
        return mulFp2(y2, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function isEqual(
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

    function addG2(
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
        if (isG2Zero(x1, y1)) {
            return (x2, y2);
        }
        if (isG2Zero(x2, y2)) {
            return (x1, y1);
        }
        if (
            isEqual(
                u1(x1),
                u2(x2),
                s1(y1),
                s2(y2)
            )
        ) {
            (x3, y3) = doubleG2(x1, y1);
        }

        Fp2 memory s = mulFp2(minusFp2(y2, y1), inverseFp2(minusFp2(x2, x1)));
        x3 = minusFp2(squaredFp2(s), addFp2(x1, x2));
        y3 = addFp2(y1, mulFp2(s, minusFp2(x3, x1)));
        uint pp = p;
        y3.x = pp - (y3.x % pp);
        y3.y = pp - (x3.x % pp);
    }

    function binstep(uint _a, uint _step) internal view returns (uint x) {
        uint pp = p;
        x = 1;
        uint a = _a;
        uint step = _step;
        while (step > 0) {
            if (step % 2 == 1) {
                x = mulmod(x, a, pp);
            }
            a = mulmod(a, a, pp);
            step /= 2;
        }
    }

    function mulG2(
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
                (x, y) = addG2(
                    x,
                    y,
                    tmpX,
                    tmpY
                );
            }
            (tmpX, tmpY) = doubleG2(tmpX, tmpY);
            step >>= 1;
        }
    }

    function bigModExp(uint index, uint loopIndex) internal view returns (uint) {
        uint[6] memory inputToBigModExp;
        inputToBigModExp[0] = 8;
        inputToBigModExp[1] = 8;
        inputToBigModExp[2] = 32;
        inputToBigModExp[3] = index;
        inputToBigModExp[4] = loopIndex;
        inputToBigModExp[5] = p;
        uint[1] memory out;
        bool success;
        assembly {
            success := staticcall(not(0), 5, inputToBigModExp, mul(6, 0x20), out, 0x20)
        }
        require(success, "BigModExp failed");
        return out[0];
    }

    function loop(uint index, bytes memory verificationVector, uint loopIndex) internal view returns (Fp2 memory, Fp2 memory) {
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
        return mulG2(
            bigModExp(index + 1, loopIndex),
            Fp2({x: uint(vector[0]), y: uint(vector[1])}),
            Fp2({x: uint(vector[2]), y: uint(vector[3])})
        );
    }

    function checkDKGVerification(Fp2 memory valX, Fp2 memory valY, bytes memory multipliedShare) internal pure returns (bool) {
        Fp2 memory tmpX;
        Fp2 memory tmpY;
        (tmpX, tmpY) = bytesToG2(multipliedShare);
        return valX.x == tmpX.x && valX.y == tmpX.y && valY.x == tmpY.x && valY.y == tmpY.y;
    }

    function checkCorrectMultipliedShare(bytes memory multipliedShare, uint secret) internal returns (bool) {
        Fp2 memory tmpX;
        Fp2 memory tmpY;
        (tmpX, tmpY) = bytesToG2(multipliedShare);
        uint[3] memory inputToMul;
        uint[2] memory mulShare;
        inputToMul[0] = g1a;
        inputToMul[1] = g1b;
        inputToMul[2] = secret;
        bool success;
        assembly {
            success := staticcall(not(0), 7, inputToMul, 0x60, mulShare, 0x40)
        }
        require(success, "Multiplication failed");
        uint pp = p;
        if (!(mulShare[0] == 0 && mulShare[1] == 0)) {
            mulShare[1] = pp - (mulShare[1] % pp);
        }

        require(isG1(g1a, g1b), "G1.one not in G1");
        require(isG1(mulShare[0], mulShare[1]), "mulShare not in G1");

        require(isG2(Fp2({x: g2a, y: g2b}), Fp2({x: g2c, y: g2d})), "G2.one not in G2");
        require(isG2(tmpX, tmpY), "tmp not in G1");

        uint[12] memory inputToPairing;
        inputToPairing[0] = g1a;
        inputToPairing[1] = g2b;
        inputToPairing[2] = tmpX.x;
        inputToPairing[3] = tmpX.y;
        inputToPairing[4] = tmpY.x;
        inputToPairing[5] = tmpY.y;
        inputToPairing[6] = mulShare[0];
        inputToPairing[7] = mulShare[1];
        inputToPairing[8] = g2a;
        inputToPairing[9] = g2b;
        inputToPairing[10] = g2c;
        inputToPairing[11] = g2d;
        uint[1] memory out;
        assembly {
            success := staticcall(not(0), 8, inputToPairing, mul(12, 0x20), out, 0x20)
        }
        require(success, "Pairing check failed");
        return out[0] != 0;
    }

    function bytesToPublicKey(bytes memory someBytes) public pure returns(uint x, uint y) {
        bytes32 pkX;
        bytes32 pkY;
        assembly {
            pkX := mload(add(someBytes, 32))
            pkY := mload(add(someBytes, 64))
        }

        x = uint(pkX);
        y = uint(pkY);
    }

    function bytesToG2(bytes memory someBytes) internal pure returns(Fp2 memory x, Fp2 memory y) {
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
