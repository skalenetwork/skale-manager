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

import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";


contract SkaleDKG is Permissions, ReentrancyGuard {

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

    mapping(bytes32 => Channel) channels;
    mapping(bytes32 => mapping(uint8 => BroadcastedData)) data;

    event ChannelOpened(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 groupIndex,
        uint fromNode,
        bytes verificationVector,
        bytes secretKeyContribution
    );

    event AllDataReceived(bytes32 groupIndex, uint nodeIndex);
    event SuccessfulDKG(bytes32 groupIndex);
    event FailedDKG(bytes32 groupIndex);
    event ComplaintSent(bytes32 groupIndex, uint fromNodeIndex, uint toNodeIndex);

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
        channels[groupIndex].broadcasted = new bool[](IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex));
        channels[groupIndex].completed = new bool[](IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex));
        emit ChannelOpened(groupIndex);
        
    }

    function broadcast(bytes32 groupIndex, uint nodeIndex, bytes memory verificationVector, bytes memory secretKeyContribution)
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, nodeIndex)
    {
        require(isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        isBroadcast(groupIndex, nodeIndex, secretKeyContribution, verificationVector);
        bytes32 vector;
        bytes32 vector1;
        bytes32 vector2;
        bytes32 vector3;
        bytes32 vector4;
        bytes32 vector5;
        assembly {
            vector := mload(add(verificationVector, 32))
            vector1 := mload(add(verificationVector, 64))
            vector2 := mload(add(verificationVector, 96))
            vector3 := mload(add(verificationVector, 128))
            vector4 := mload(add(verificationVector, 160))
            vector5 := mload(add(verificationVector, 192))
        }
        adding(groupIndex, uint(vector), uint(vector1), uint(vector2), uint(vector3), uint(vector4), uint(vector5));
        emit BroadcastAndKeyShare(groupIndex, nodeIndex, verificationVector, secretKeyContribution);
    }

    function complaint(bytes32 groupIndex, uint fromNodeIndex, uint toNodeIndex)
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
        correctNode(groupIndex, toNodeIndex)
    {
        require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        if (isBroadcasted(groupIndex, toNodeIndex) && channels[groupIndex].nodeToComplaint == 0) {
            // need to wait a response from toNodeIndex
            channels[groupIndex].nodeToComplaint = toNodeIndex;
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

    function response(bytes32 groupIndex, uint fromNodeIndex, uint secretNumber)
        public
        correctGroup(groupIndex)
        correctNode(groupIndex, fromNodeIndex)
    {
        require(channels[groupIndex].nodeToComplaint == fromNodeIndex, "Not this Node");
        require(isNodeByMessageSender(fromNodeIndex, msg.sender), "Node does not exist for message sender");
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        bytes memory publicKey = INodesData(nodesDataAddress).getNodePublicKey(channels[groupIndex].fromNodeToComplaint);
        // DH common secret generate
        // Decrypt secret key contribution
        // DKG verification(secret key contribution, verification vector)
        // slash someone
        // Fail DKG        
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

    function adding(
        bytes32 groupIndex,
        uint x1,
        uint y1,
        uint x2,
        uint y2,
        uint x3,
        uint y3) internal
    {
        if (channels[groupIndex].publicKeyx.x == 0 &&
            channels[groupIndex].publicKeyx.y == 0 &&
            channels[groupIndex].publicKeyy.x == 0 &&
            channels[groupIndex].publicKeyy.y == 0) {
            (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = toAffineCoordinatesG2(
                Fp2({ x: x1, y: y1 }), Fp2({ x: x2, y: y2 }), Fp2({ x: x3, y: y3 }));
        } else {
            Fp2 memory a;
            Fp2 memory b;
            (a, b) = toAffineCoordinatesG2(Fp2({ x: x2, y: y1 }), Fp2({ x: x2, y: y2 }), Fp2({ x: x3, y: y3 }));
            addG2(
                groupIndex,
                a,
                b,
                channels[groupIndex].publicKeyx,
                channels[groupIndex].publicKeyy);
        }
    }

    function isBroadcast(bytes32 groupIndex, uint nodeIndex, bytes memory sc, bytes memory vv) internal {
        uint index = findNode(groupIndex, nodeIndex);
        require(!channels[groupIndex].broadcasted[index], "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
        channels[groupIndex].numberOfBroadcasted++;
        data[groupIndex][uint8(index)] = BroadcastedData({
            secretKeyContribution: sc,
            verificationVector: vv
        });
    }

    function isBroadcasted(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {
        uint index = findNode(groupIndex, nodeIndex);
        if (channels[groupIndex].broadcasted[index]) {
            return true;
        }
        return false;
    }

    function findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint index) {
        uint[] memory nodesInGroup = IGroupsData(channels[groupIndex].dataAddress).getNodesInGroup(groupIndex);
        for (index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex) {
                return index;
            }
        }
        return index;
    }

    function isNodeByMessageSender(uint nodeIndex, address from) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        return INodesData(nodesDataAddress).isNodeExist(from, nodeIndex);
    }

    function addFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        return Fp2({ x: addmod(a.x, b.x, p), y: addmod(a.y, b.y, p) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint first;
        uint second;
        if (a.x >= b.x) {
            first = addmod(a.x, p - b.x, p);
        } else {
            first = p - addmod(b.x, p - a.x, p);
        }
        if (a.y >= b.y) {
            second = addmod(a.y, p - b.y, p);
        } else {
            second = p - addmod(b.y, p - a.y, p);
        }
        return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal view returns (Fp2 memory) {
        uint aA = mulmod(a.x, b.x, p);
        uint bB = mulmod(a.y, b.y, p);
        return Fp2({
            x: addmod(aA, mulmod(p - 1, bB, p), p),
            y: addmod(mulmod(addmod(a.x, a.y, p), addmod(b.x, b.y, p), p), p - addmod(aA, bB, p), p)
        });
    }

    function squaredFp2(Fp2 memory a) internal view returns (Fp2 memory) {
        uint ab = mulmod(a.x, a.y, p);
        uint mult = mulmod(addmod(a.x, a.y, p), addmod(a.x, mulmod(p - 1, a.y, p), p), p);
        uint addition = addmod(ab, mulmod(p - 1, ab, p), p);
        return Fp2({ x: addmod(mult, p - addition, p), y: addmod(ab, ab, p) });
    }

    function doubleG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal view returns (Fp2 memory, Fp2 memory) {
        Fp2 memory a = squaredFp2(x1);
        Fp2 memory c = squaredFp2(squaredFp2(y1));
        Fp2 memory d = minusFp2(squaredFp2(addFp2(x1, squaredFp2(y1))), addFp2(a, c));
        d = addFp2(d, d);
        Fp2 memory e = addFp2(a, addFp2(a, a));
        Fp2 memory f = squaredFp2(e);
        Fp2 memory eightC = addFp2(c, c);
        eightC = addFp2(eightC, eightC);
        eightC = addFp2(eightC, eightC);
        Fp2 memory y1z1 = mulFp2(y1, z1);
        return toAffineCoordinatesG2(
            minusFp2(f, addFp2(d, d)), minusFp2(mulFp2(e, minusFp2(d, minusFp2(f, addFp2(d, d)))), eightC), addFp2(y1z1, y1z1)
        );
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
        Fp2 memory s2Value) internal pure returns (bool)
    {
        return (u1Value.x == u2Value.x && u1Value.y == u2Value.y && s1Value.x == s2Value.x && s1Value.y == s2Value.y);
    }

    function zForAddingG2(Fp2 memory u2Value, Fp2 memory u1Value) internal view returns (Fp2 memory) {
        Fp2 memory z = Fp2({ x: 1, y: 0 });
        Fp2 memory zz = squaredFp2(z);
        return mulFp2(minusFp2(squaredFp2(addFp2(z, z)), addFp2(zz, zz)), minusFp2(u2Value, u1Value));
    }

    function yForAddingG2(
        Fp2 memory s2Value,
        Fp2 memory s1Value,
        Fp2 memory u2Value,
        Fp2 memory u1Value,
        Fp2 memory x) internal view returns (Fp2 memory)
    {
        Fp2 memory r = addFp2(minusFp2(s2Value, s1Value), minusFp2(s2Value, s1Value));
        Fp2 memory theI = squaredFp2(addFp2(minusFp2(u2Value, u1Value), minusFp2(u2Value, u1Value)));
        Fp2 memory v = mulFp2(u1Value, theI);
        Fp2 memory j = mulFp2(minusFp2(u2Value, u1Value), theI);
        return minusFp2(mulFp2(r, minusFp2(v, x)), addFp2(mulFp2(s1Value, j), mulFp2(s1Value, j)));
    }

    function xForAddingG2(
        Fp2 memory s2Value,
        Fp2 memory s1Value,
        Fp2 memory u2Value,
        Fp2 memory u1Value) internal view returns (Fp2 memory)
    {
        Fp2 memory r = addFp2(minusFp2(s2Value, s1Value), minusFp2(s2Value, s1Value));
        Fp2 memory theI = squaredFp2(addFp2(minusFp2(u2Value, u1Value), minusFp2(u2Value, u1Value)));
        Fp2 memory v = mulFp2(u1Value, theI);
        Fp2 memory j = mulFp2(minusFp2(u2Value, u1Value), theI);
        return minusFp2(squaredFp2(r), addFp2(j, addFp2(v, v)));
    }

    function addG2(
        bytes32 groupIndex,
        Fp2 memory x1,
        Fp2 memory y1,
        Fp2 memory x2,
        Fp2 memory y2) internal
    {
        if (isEqual(
            u1(x1),
            u2(x2),
            s1(y1),
            s2(y2)
            )) {
            (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = doubleG2(x1, y1, Fp2({ x: 1, y: 0 }));
        }
        //x = xForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1));
        //y = yForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1), x);
        //Fp2 memory z = zForAddingG2(U2(x2), U1(x1));
        (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = toAffineCoordinatesG2(
            xForAddingG2(s2(y2), s1(y1), u2(x2), u1(x1)),
            yForAddingG2(s2(y2), s1(y1), u2(x2), u1(x1), xForAddingG2(s2(y2), s1(y1), u2(x2), u1(x1))),
            zForAddingG2(u2(x2), u1(x1))
        );
    }

    function binstep(uint _a, uint _step) internal view returns (uint x) {
        x = 1;
        uint a = _a;
        uint step = _step;
        while (step > 0) {
            if (step % 2 == 1) {
                x = mulmod(x, a, p);
            }
            a = mulmod(a, a, p);
            step /= 2;
        }
    }

    function inverseFp2(Fp2 memory a) internal view returns (Fp2 memory x) {
        uint t0 = mulmod(a.x, a.x, p);
        uint t1 = mulmod(a.y, a.y, p);
        uint t2 = mulmod(p - 1, t1, p);
        if (t0 >= t2) {
            t2 = addmod(t0, p - t2, p);
        } else {
            t2 = p - addmod(t2, p - t0, p);
        }
        uint t3 = binstep(t2, p - 2);
        x.x = mulmod(a.x, t3, p);
        x.y = p - mulmod(a.y, t3, p);
    }

    function toAffineCoordinatesG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal view returns (Fp2 memory x, Fp2 memory y) {
        if (z1.x == 0 && z1.y == 0) {
            x.x = 0;
            x.y = 0;
            y.x = 1;
            y.y = 0;
        } else {
            Fp2 memory zInv = inverseFp2(z1);
            Fp2 memory z2Inv = squaredFp2(zInv);
            Fp2 memory z3Inv = mulFp2(z2Inv, zInv);
            x = mulFp2(x1, z2Inv);
            y = mulFp2(y1, z3Inv);
        }
    }
}
