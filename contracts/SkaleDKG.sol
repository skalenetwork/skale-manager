pragma solidity ^0.5.0;

import "./Permissions.sol";

interface IGroupsData {
    function setPublicKey(
        bytes32 groupIndex,
        uint pubKeyx1,
        uint pubKeyy1,
        uint pubKeyx2,
        uint pubKeyy2) external;
    function getNodesInGroup() external view returns (uint[] memory);
    function getNumberOfNodesInGroup() external view returns (uint);
}

interface INodesData {
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
}


contract SkaleDKG is Permissions {

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

    uint p = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

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

    function openChannel(bytes32 groupIndex, address dataAddress) public {
        require(dataAddress == msg.sender, "Does not allow");
        require(!channels[groupIndex].active, "Channel already is created");
        channels[groupIndex].active = true;
        channels[groupIndex].dataAddress = dataAddress;
        emit ChannelOpened(groupIndex);
    }

    function broadcast(
        bytes32 groupIndex,
        uint nodeIndex,
        bytes memory verificationVector,
        bytes memory secretKeyContribution) public
    {
        require(channels[groupIndex].active, "Chennel is not created");
        isBroadcast(groupIndex, nodeIndex);
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
    }

    function complaint() public;

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

    function isBroadcast(bytes32 groupIndex, uint nodeIndex) internal {
        uint index = findNode(groupIndex, nodeIndex);
        require(index < IGroupsData(channels[groupIndex].dataAddress).getNumberOfNodesInGroup(), "Node is not in this group");
        require(isNodeByMessageSender(nodeIndex, msg.sender), "Node does not exist for message sender");
        require(!channels[groupIndex].broadcasted[index], "This node is already broadcasted");
        channels[groupIndex].broadcasted[index] = true;
    }

    function findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint index) {
        uint[] memory nodesInGroup = IGroupsData(channels[groupIndex].dataAddress).getNodesInGroup();
        for (index = 0; index < nodesInGroup.length; index++) {
            if (nodesInGroup[index] == nodeIndex) {
                return index;
            }
        }
        return index;
    }

    function isNodeByMessageSender(uint nodeIndex, address from) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        INodesData(nodesDataAddress).isNodeExist(from, nodeIndex);
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
        Fp2 memory A = squaredFp2(x1);
        Fp2 memory C = squaredFp2(squaredFp2(y1));
        Fp2 memory D = minusFp2(squaredFp2(addFp2(x1, squaredFp2(y1))), addFp2(A, C));
        D = addFp2(D, D);
        Fp2 memory E = addFp2(A, addFp2(A, A));
        Fp2 memory F = squaredFp2(E);
        Fp2 memory eightC = addFp2(C, C);
        eightC = addFp2(eightC, eightC);
        eightC = addFp2(eightC, eightC);
        Fp2 memory y1z1 = mulFp2(y1, z1);
        return toAffineCoordinatesG2(
            minusFp2(F, addFp2(D, D)), minusFp2(mulFp2(E, minusFp2(D, minusFp2(F, addFp2(D, D)))), eightC), addFp2(y1z1, y1z1)
        );
    }

    function U1(Fp2 memory x1) internal view returns (Fp2 memory) {
        return mulFp2(x1, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function U2(Fp2 memory x2) internal view returns (Fp2 memory) {
        return mulFp2(x2, squaredFp2(Fp2({ x: 1, y: 0 })));
    }

    function S1(Fp2 memory y1) internal view returns (Fp2 memory) {
        return mulFp2(y1, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function S2(Fp2 memory y2) internal view returns (Fp2 memory) {
        return mulFp2(y2, mulFp2(Fp2({ x: 1, y: 0 }), squaredFp2(Fp2({ x: 1, y: 0 }))));
    }

    function isEqual(
        Fp2 memory u1,
        Fp2 memory u2,
        Fp2 memory s1,
        Fp2 memory s2) internal pure returns (bool)
    {
        return (u1.x == u2.x && u1.y == u2.y && s1.x == s2.x && s1.y == s2.y);
    }

    function zForAddingG2(Fp2 memory u2, Fp2 memory u1) internal view returns (Fp2 memory) {
        Fp2 memory z = Fp2({ x: 1, y: 0 });
        Fp2 memory zz = squaredFp2(z);
        return mulFp2(minusFp2(squaredFp2(addFp2(z, z)), addFp2(zz, zz)), minusFp2(u2, u1));
    }

    function yForAddingG2(
        Fp2 memory s2,
        Fp2 memory s1,
        Fp2 memory u2,
        Fp2 memory u1,
        Fp2 memory x) internal view returns (Fp2 memory)
    {
        Fp2 memory r = addFp2(minusFp2(s2, s1), minusFp2(s2, s1));
        Fp2 memory theI = squaredFp2(addFp2(minusFp2(u2, u1), minusFp2(u2, u1)));
        Fp2 memory V = mulFp2(u1, theI);
        Fp2 memory J = mulFp2(minusFp2(u2, u1), theI);
        return minusFp2(mulFp2(r, minusFp2(V, x)), addFp2(mulFp2(s1, J), mulFp2(s1, J)));
    }

    function xForAddingG2(
        Fp2 memory s2,
        Fp2 memory s1,
        Fp2 memory u2,
        Fp2 memory u1) internal view returns (Fp2 memory)
    {
        Fp2 memory r = addFp2(minusFp2(s2, s1), minusFp2(s2, s1));
        Fp2 memory theI = squaredFp2(addFp2(minusFp2(u2, u1), minusFp2(u2, u1)));
        Fp2 memory V = mulFp2(u1, theI);
        Fp2 memory J = mulFp2(minusFp2(u2, u1), theI);
        return minusFp2(squaredFp2(r), addFp2(J, addFp2(V, V)));
    }

    function addG2(
        bytes32 groupIndex,
        Fp2 memory x1,
        Fp2 memory y1,
        Fp2 memory x2,
        Fp2 memory y2) internal
    {
        if (isEqual(
            U1(x1),
            U2(x2),
            S1(y1),
            S2(y2)
            )) {
            (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = doubleG2(x1, y1, Fp2({ x: 1, y: 0 }));
        }
        //x = xForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1));
        //y = yForAddingG2(S2(y2), S1(y1), U2(x2), U1(x1), x);
        //Fp2 memory z = zForAddingG2(U2(x2), U1(x1));
        (channels[groupIndex].publicKeyx, channels[groupIndex].publicKeyy) = toAffineCoordinatesG2(
            xForAddingG2(
                S2(y2), S1(y1), U2(x2), U1(x1)
            ), yForAddingG2(
                S2(y2), S1(y1), U2(x2), U1(x1), xForAddingG2(
                    S2(y2),
                    S1(y1),
                    U2(x2),
                    U1(x1))
            ), zForAddingG2(
                U2(x2), U1(x1)
            )
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
            Fp2 memory Z_inv = inverseFp2(z1);
            Fp2 memory Z2_inv = squaredFp2(Z_inv);
            Fp2 memory Z3_inv = mulFp2(Z2_inv, Z_inv);
            x = mulFp2(x1, Z2_inv);
            y = mulFp2(y1, Z3_inv);
        }
    }
}
