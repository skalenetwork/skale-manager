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

pragma solidity 0.6.10;
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

    // Unused variable!!
    mapping(bytes32 => mapping(uint => BroadcastedData)) private _data;
    // 
    
    mapping(bytes32 => G2Operations.G2Point) private _publicKeysInProgress;
    mapping(bytes32 => G2Operations.G2Point) private _schainsPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) private _schainsNodesPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) private _previousSchainsPublicKeys;

    function deleteKey(bytes32 groupIndex) external allow("SkaleDKG") {
        _previousSchainsPublicKeys[groupIndex].push(_schainsPublicKeys[groupIndex]);
        delete _schainsPublicKeys[groupIndex];
    }

    function initPublicKeyInProgress(bytes32 groupIndex) external allow("SkaleDKG") {
        _publicKeysInProgress[groupIndex] = G2Operations.getG2Zero();
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
                require(verificationVector[i].isG2(), "Incorrect g2 point verVec 1");

                G2Operations.G2Point memory tmp = verificationVector[i];
                _schainsNodesPublicKeys[groupIndex].push(tmp);

                require(_schainsNodesPublicKeys[groupIndex][i].isG2(), "Incorrect g2 point schainNodesPubKey 1");
            }

            while (_schainsNodesPublicKeys[groupIndex].length > verificationVector.length) {
                _schainsNodesPublicKeys[groupIndex].pop();
            }
        } else {
            require(_schainsNodesPublicKeys[groupIndex].length == verificationVector.length, "Incorrect length");

            for (uint i = 0; i < _schainsNodesPublicKeys[groupIndex].length; ++i) {
                require(verificationVector[i].isG2(), "Incorrect g2 point verVec 2");
                require(_schainsNodesPublicKeys[groupIndex][i].isG2(), "Incorrect g2 point schainNodesPubKey 2");

                _schainsNodesPublicKeys[groupIndex][i] = verificationVector[i].addG2(
                    _schainsNodesPublicKeys[groupIndex][i]
                );

                require(_schainsNodesPublicKeys[groupIndex][i].isG2(), "Incorrect g2 point addition");
            }

        }
    }

    function getCommonPublicKey(bytes32 groupIndex) external view returns (G2Operations.G2Point memory) {
        return _schainsPublicKeys[groupIndex];
    }

    function getPreviousPublicKey(bytes32 groupIndex) external view returns (G2Operations.G2Point memory) {
        uint length = _previousSchainsPublicKeys[groupIndex].length;
        if (length == 0) {
            return G2Operations.getG2Zero();
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

    function _calculateBlsPublicKey(bytes32 groupIndex, uint index)
        private
        view
        returns (G2Operations.G2Point memory)
    {
        G2Operations.G2Point memory publicKey = G2Operations.getG2Zero();
        G2Operations.G2Point memory tmp = G2Operations.getG2Zero();
        G2Operations.G2Point[] memory publicValues = _schainsNodesPublicKeys[groupIndex];
        for (uint i = 0; i < publicValues.length; ++i) {
            require(publicValues[i].isG2(), "Incorrect g2 point publicValuesComponent");
            tmp = publicValues[i].mulG2(Precompiled.bigModExp(index.add(1), i, Fp2Operations.P));
            require(tmp.isG2(), "Incorrect g2 point tmp");
            publicKey = tmp.addG2(publicKey);
            require(publicKey.isG2(), "Incorrect g2 point publicKey");
        }
        return publicKey;
    }

    function _isSchainsPublicKeyZero(bytes32 schainId) private view returns (bool) {
        return _schainsPublicKeys[schainId].x.a == 0 &&
            _schainsPublicKeys[schainId].x.b == 0 &&
            _schainsPublicKeys[schainId].y.a == 0 &&
            _schainsPublicKeys[schainId].y.b == 0;
    }

    function _getData() private view returns (BroadcastedData memory) {
        return _data[keccak256(abi.encodePacked("UnusedFunction"))][0];
    }
}