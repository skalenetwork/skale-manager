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
        Fp2 publicKeyx;
        Fp2 publicKeyy;
        uint numberOfCompleted;
        bool[] completed;
    }

    struct Fp2 {
        uint x;
        uint y;
    }

    uint constant P = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    mapping(bytes32 => Channel) channels;

    event ChannelOpened(bytes32 groupIndex);

    event BroadcastAndKeyShare(
        bytes32 groupIndex,
        uint fromNode,
        bytes verificationVector,
        bytes secretKeyContribution
    );

    constructor(address contractsAddress) Permissions(contractsAddress) public {

    }

    function openChannel(bytes32 groupIndex, address dataAddress) external {
        require(dataAddress == msg.sender, "Does not allow");
        require(!channels[groupIndex].active, "Channel already is created");
        channels[groupIndex].active = true;
        channels[groupIndex].dataAddress = dataAddress;
        emit ChannelOpened(groupIndex);
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes calldata verificationVector,
        bytes calldata secretKeyContribution) external
    {
        require(channels[groupIndex].active, "Chennel is not created");

        bytes32 vector;
        bytes32 vector1;
        bytes32 vector2;
        bytes32 vector3;
        bytes32 vector4;
        bytes32 vector5;
        bytes memory memoryVerificationVector = verificationVector;
        assembly {
            vector := mload(add(memoryVerificationVector, 32))
            vector1 := mload(add(memoryVerificationVector, 64))
            vector2 := mload(add(memoryVerificationVector, 96))
            vector3 := mload(add(memoryVerificationVector, 128))
            vector4 := mload(add(memoryVerificationVector, 160))
            vector5 := mload(add(memoryVerificationVector, 192))
        }
        /*if (channels[groupIndex].publicKeyx.x == 0 && channels[groupIndex].publicKeyx.y == 0 && channels[groupIndex].publicKeyy.x == 0 && channels[groupIndex].publicKeyy.y == 0) {
            (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = toAffineCoordinatesG2(Fp2({ x: uint(vector), y: uint(vector1) }), Fp2({ x: uint(vector2), y: uint(vector3) }), Fp2({ x: uint(vector4), y: uint(vector5) }));
        } else {
            Fp2 memory x1;
            Fp2 memory y1;
            (x1, y1) = toAffineCoordinatesG2(Fp2({ x: uint(vector), y: uint(vector1) }), Fp2({ x: uint(vector2), y: uint(vector3) }), Fp2({ x: uint(vector4), y: uint(vector5) }));
            addG2(groupIndex, x1, y1, channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy);
        }*/
        adding(
            groupIndex,
            uint(vector),
            uint(vector1),
            uint(vector2),
            uint(vector3),
            uint(vector4),
            uint(vector5));
        emit BroadcastAndKeyShare(
            groupIndex,
            nodeIndex,
            verificationVector,
            secretKeyContribution);

        isBroadcast(groupIndex, nodeIndex);
    }

    function complaint() external;

    //function allright() public;

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

    function isBroadcast(bytes32 groupIndex, uint nodeIndex) internal nonReentrant {
        uint index = findNode(groupIndex, nodeIndex);

        bool broadcasted = channels[groupIndex].broadcasted[index];
        channels[groupIndex].broadcasted[index] = true;

        require(index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(groupIndex), "Node is not in this group");
        require(isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        require(!broadcasted, "This node is already broadcasted");
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
        address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        return INodesData(nodesDataAddress).isNodeExist(from, nodeIndex);
    }

    function addFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        return Fp2({ x: addmod(a.x, b.x, P), y: addmod(a.y, b.y, P) });
    }

    function minusFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint first;
        uint second;
        if (a.x >= b.x) {
            first = addmod(a.x, P - b.x, P);
        } else {
            first = P - addmod(b.x, P - a.x, P);
        }
        if (a.y >= b.y) {
            second = addmod(a.y, P - b.y, P);
        } else {
            second = P - addmod(b.y, P - a.y, P);
        }
        return Fp2({ x: first, y: second });
    }

    function mulFp2(Fp2 memory a, Fp2 memory b) internal pure returns (Fp2 memory) {
        uint aA = mulmod(a.x, b.x, P);
        uint bB = mulmod(a.y, b.y, P);
        return Fp2({
            x: addmod(aA, mulmod(P - 1, bB, P), P),
            y: addmod(mulmod(addmod(a.x, a.y, P), addmod(b.x, b.y, P), P), P - addmod(aA, bB, P), P)
        });
    }

    function squaredFp2(Fp2 memory a) internal pure returns (Fp2 memory) {
        uint ab = mulmod(a.x, a.y, P);
        uint mult = mulmod(addmod(a.x, a.y, P), addmod(a.x, mulmod(P - 1, a.y, P), P), P);
        uint addition = addmod(ab, mulmod(P - 1, ab, P), P);
        return Fp2({ x: addmod(mult, P - addition, P), y: addmod(ab, ab, P) });
    }

    function doubleG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal pure returns (Fp2 memory, Fp2 memory) {
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

    function u1(Fp2 memory x1) internal pure returns (Fp2 memory) {
        return mulFp2(x1, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function u2(Fp2 memory x2) internal pure returns (Fp2 memory) {
        return mulFp2(x2, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function s1(Fp2 memory y1) internal pure returns (Fp2 memory) {
        return mulFp2(y1, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function s2(Fp2 memory y2) internal pure returns (Fp2 memory) {
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

    function zForAddingG2(Fp2 memory u2Value, Fp2 memory u1Value) internal pure returns (Fp2 memory) {
        Fp2 memory z = Fp2({ x: 1, y: 0 });
        Fp2 memory zz = squaredFp2(z);
        return mulFp2(minusFp2(squaredFp2(addFp2(z, z)), addFp2(zz, zz)), minusFp2(u2Value, u1Value));
    }

    function yForAddingG2(
        Fp2 memory s2Value,
        Fp2 memory s1Value,
        Fp2 memory u2Value,
        Fp2 memory u1Value,
        Fp2 memory x) internal pure returns (Fp2 memory)
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
        Fp2 memory u1Value) internal pure returns (Fp2 memory)
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
            xForAddingG2(
                s2(y2), s1(y1), u2(x2), u1(x1)
            ), yForAddingG2(
                s2(y2), s1(y1), u2(x2), u1(x1), xForAddingG2(
                    s2(y2),
                    s1(y1),
                    u2(x2),
                    u1(x1))
            ), zForAddingG2(
                u2(x2), u1(x1)
            )
        );
    }

    function binstep(uint _a, uint _step) internal pure returns (uint x) {
        x = 1;
        uint a = _a;
        uint step = _step;
        while (step > 0) {
            if (step % 2 == 1) {
                x = mulmod(x, a, P);
            }
            a = mulmod(a, a, P);
            step /= 2;
        }
    }

    function inverseFp2(Fp2 memory a) internal pure returns (Fp2 memory x) {
        uint t0 = mulmod(a.x, a.x, P);
        uint t1 = mulmod(a.y, a.y, P);
        uint t2 = mulmod(P - 1, t1, P);
        if (t0 >= t2) {
            t2 = addmod(t0, P - t2, P);
        } else {
            t2 = P - addmod(t2, P - t0, P);
        }
        uint t3 = binstep(t2, P - 2);
        x.x = mulmod(a.x, t3, P);
        x.y = P - mulmod(a.y, t3, P);
    }

    function toAffineCoordinatesG2(Fp2 memory x1, Fp2 memory y1, Fp2 memory z1) internal pure returns (Fp2 memory x, Fp2 memory y) {
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
