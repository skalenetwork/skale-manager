// SPDX-License-Identifier: AGPL-3.0-only

/*
    KeyStorage.sol - SKALE Manager
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

pragma solidity 0.6.9;
pragma experimental ABIEncoderV2;
import "./Decryption.sol";
import "./Permissions.sol";
import "./SchainsInternal.sol";
import "./ECDH.sol";
import "./utils/Precompiled.sol";
import "./utils/FieldOperations.sol";

contract KeyStorage is Permissions {
    using Fp2Operations for Fp2Operations.Fp2Point;
    using G2Operations for G2Operations.G2Point;

    struct BroadcastedData {
        KeyShare[] secretKeyContribution;
        G2Operations.G2Point[] verificationVector;
    }

    struct KeyShare {
        bytes32[2] publicKey;
        bytes32 share;
    }

    mapping(bytes32 => mapping(uint => BroadcastedData)) private _data;
    mapping(bytes32 => G2Operations.G2Point) private _publicKeysInProgress;
    mapping(bytes32 => G2Operations.G2Point) private _schainsPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) private _schainsNodesPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) private _previousSchainsPublicKeys;

    function addBroadcastedData(
        bytes32 groupIndex,
        uint indexInSchain,
        KeyShare[] memory secretKeyContribution,
        G2Operations.G2Point[] memory verificationVector
    )
        external
        allow("SkaleDKG")
    {
        for (uint i = 0; i < secretKeyContribution.length; ++i) {
            if (i < _data[groupIndex][indexInSchain].secretKeyContribution.length) {
                _data[groupIndex][indexInSchain].secretKeyContribution[i] = secretKeyContribution[i];
            } else {
                _data[groupIndex][indexInSchain].secretKeyContribution.push(secretKeyContribution[i]);
            }
        }
        while (_data[groupIndex][indexInSchain].secretKeyContribution.length > secretKeyContribution.length) {
            _data[groupIndex][indexInSchain].secretKeyContribution.pop();
        }

        for (uint i = 0; i < verificationVector.length; ++i) {
            if (i < _data[groupIndex][indexInSchain].verificationVector.length) {
                _data[groupIndex][indexInSchain].verificationVector[i] = verificationVector[i];
            } else {
                _data[groupIndex][indexInSchain].verificationVector.push(verificationVector[i]);
            }
        }
        while (_data[groupIndex][indexInSchain].verificationVector.length > verificationVector.length) {
            _data[groupIndex][indexInSchain].verificationVector.pop();
        }
    }

    function deleteKey(bytes32 groupIndex) external allow("SkaleDKG") {
        _previousSchainsPublicKeys[groupIndex].push(_schainsPublicKeys[groupIndex]);
        delete _schainsPublicKeys[groupIndex];
    }

    function initPublicKeyInProgress(bytes32 groupIndex) external allow("SkaleDKG") {
        _publicKeysInProgress[groupIndex] = G2Operations.G2Point({
            x: Fp2Operations.Fp2Point({
                a: 0,
                b: 0
            }),
            y: Fp2Operations.Fp2Point({
                a: 1,
                b: 0
            })
        });
        _removeAllBroadcastedData(groupIndex);
        delete _schainsNodesPublicKeys[groupIndex];
    }

    function adding(bytes32 groupIndex, G2Operations.G2Point memory value) external allow("SkaleDKG") {
        require(value.isG2(), "Incorrect g2 point");
        _publicKeysInProgress[groupIndex] = value.addG2(_publicKeysInProgress[groupIndex]);
    }

    function finalizePublicKey(bytes32 groupIndex) external allow("SkaleDKG") {
        if (!_isSchainsPublicKeyZero(groupIndex)) {
            _previousSchainsPublicKeys[groupIndex].push(_schainsPublicKeys[groupIndex]);
        }
        _schainsPublicKeys[groupIndex] = _publicKeysInProgress[groupIndex];
        delete _publicKeysInProgress[groupIndex];
    }

    function computePublicValues(bytes32 groupIndex, G2Operations.G2Point[] calldata verificationVector)
        external
        allow("SkaleDKG")
    {
        if (_schainsNodesPublicKeys[groupIndex].length == 0) {
            for (uint i = 0; i < verificationVector.length; ++i) {
                require(verificationVector[i].isG2(), "Incorrect g2 point");
                G2Operations.G2Point memory tmp = verificationVector[i];
                _schainsNodesPublicKeys[groupIndex].push(tmp);
            }
        } else {
            for (uint i = 0; i < _schainsNodesPublicKeys[groupIndex].length; ++i) {
                require(verificationVector[i].isG2(), "Incorrect g2 point");
                _schainsNodesPublicKeys[groupIndex][i] = verificationVector[i].addG2(
                    _schainsNodesPublicKeys[groupIndex][i]
                );
            }
        }
    }

    function verify(
        bytes32 groupIndex,
        uint nodeToComplaint,
        uint fromNodeToComplaint,
        uint secretNumber,
        G2Operations.G2Point memory multipliedShare
    )
        external
        view
        returns (bool)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        uint index = schainsInternal.getNodeIndexInGroup(groupIndex, nodeToComplaint);
        uint secret = _decryptMessage(groupIndex, secretNumber, nodeToComplaint, fromNodeToComplaint);
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

    function getBroadcastedData(bytes32 groupIndex, uint nodeIndex)
        external
        view
        returns (KeyShare[] memory, G2Operations.G2Point[] memory)
    {
        uint indexInSchain = SchainsInternal(contractManager.getContract("SchainsInternal")).getNodeIndexInGroup(
            groupIndex,
            nodeIndex
        );
        if (
            _data[groupIndex][indexInSchain].secretKeyContribution.length == 0 &&
            _data[groupIndex][indexInSchain].verificationVector.length == 0
        ) {
            KeyShare[] memory keyShare = new KeyShare[](0);
            G2Operations.G2Point[] memory g2Point = new G2Operations.G2Point[](0);
            return (keyShare, g2Point);
        }
        return (
            _data[groupIndex][indexInSchain].secretKeyContribution,
            _data[groupIndex][indexInSchain].verificationVector
        );
    }

    function getSecretKeyShare(bytes32 groupIndex, uint nodeIndex, uint index)
        external
        view
        returns (bytes32)
    {
        uint indexInSchain = SchainsInternal(contractManager.getContract("SchainsInternal")).getNodeIndexInGroup(
            groupIndex,
            nodeIndex
        );
        return (_data[groupIndex][indexInSchain].secretKeyContribution[index].share);
    }

    function getVerificationVector(bytes32 groupIndex, uint nodeIndex)
        external
        view
        returns (G2Operations.G2Point[] memory)
    {
        uint indexInSchain = SchainsInternal(contractManager.getContract("SchainsInternal")).getNodeIndexInGroup(
            groupIndex,
            nodeIndex
        );
        return (_data[groupIndex][indexInSchain].verificationVector);
    }

    function getCommonPublicKey(bytes32 groupIndex) external view returns (G2Operations.G2Point memory) {
        return _schainsPublicKeys[groupIndex];
    }

    function getPreviousPublicKey(bytes32 groupIndex) external view returns (G2Operations.G2Point memory) {
        uint length = _previousSchainsPublicKeys[groupIndex].length;
        if (length == 0) {
            return G2Operations.G2Point({
                x: Fp2Operations.Fp2Point({
                    a: 0,
                    b: 0
                }),
                y: Fp2Operations.Fp2Point({
                    a: 0,
                    b: 0
                })
            });
        }
        return _previousSchainsPublicKeys[groupIndex][length - 1];
    }

    function getAllPreviousPublicKeys(bytes32 groupIndex) external view returns (G2Operations.G2Point[] memory) {
        return _previousSchainsPublicKeys[groupIndex];
    }

    function getBLSPublicKey(bytes32 groupIndex, uint nodeIndex) external view returns (G2Operations.G2Point memory) {
        uint index = SchainsInternal(contractManager.getContract("SchainsInternal")).getNodeIndexInGroup(
            groupIndex,
            nodeIndex
        );
        return _calculateBlsPublicKey(groupIndex, index);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

    function _removeAllBroadcastedData(bytes32 groupIndex) internal {
        uint length = SchainsInternal(
            contractManager.getContract("SchainsInternal")
        ).getNumberOfNodesInGroup(groupIndex);
        for (uint i = 0; i < length; i++) {
            delete _data[groupIndex][i];
        }
    }

    function _calculateBlsPublicKey(bytes32 groupIndex, uint index)
        private
        view
        returns (G2Operations.G2Point memory)
    {
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
        G2Operations.G2Point[] memory publicValues = _schainsNodesPublicKeys[groupIndex];
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

    function _isSchainsPublicKeyZero(bytes32 schainId) private view returns (bool) {
        return _schainsPublicKeys[schainId].x.a == 0 &&
            _schainsPublicKeys[schainId].x.b == 0 &&
            _schainsPublicKeys[schainId].y.a == 0 &&
            _schainsPublicKeys[schainId].y.b == 0;
    }

    function _getCommonPublicKey(
        uint256 secretNumber,
        uint fromNodeToComplaint
    )
        private
        view
        returns (bytes32 key)
    {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        ECDH ecdh = ECDH(contractManager.getContract("ECDH"));
        bytes32[2] memory publicKey = nodes.getNodePublicKey(fromNodeToComplaint);
        uint256 pkX = uint(publicKey[0]);
        uint256 pkY = uint(publicKey[1]);

        (pkX, pkY) = ecdh.deriveKey(secretNumber, pkX, pkY);

        key = bytes32(pkX);
    }

    function _decryptMessage(
        bytes32 groupIndex,
        uint secretNumber,
        uint nodeToComplaint,
        uint fromNodeToComplaint
    )
        private
        view
        returns (uint)
    {
        Decryption decryption = Decryption(contractManager.getContract("Decryption"));

        bytes32 key = _getCommonPublicKey(secretNumber, fromNodeToComplaint);

        // Decrypt secret key contribution
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        uint index = schainsInternal.getNodeIndexInGroup(groupIndex, fromNodeToComplaint);
        uint indexOfNode = schainsInternal.getNodeIndexInGroup(groupIndex, nodeToComplaint);
        uint secret = decryption.decrypt(
            _data[groupIndex][indexOfNode].secretKeyContribution[index].share,
            key
        );
        return secret;
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