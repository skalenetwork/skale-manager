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
    mapping(bytes32 => G2Operations.G2Point) public schainsPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) public schainsNodesPublicKeys;
    mapping(bytes32 => G2Operations.G2Point[]) public previousSchainsPublicKeys;

    function addBroadcastedData(
        bytes32 groupIndex,
        uint indexInSchain,
        KeyShare[] memory secretKeyContribution,
        G2Operations.G2Point[] memory verificationVector
    )
        external
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

    function calculateBlsPublicKey(bytes32 groupIndex, uint index)
        external
        allow("SkaleDKG")
        view
        returns (G2Operations.G2Point memory)
    {
        // uint index = _nodeIndexInSchain(groupIndex, nodeIndex);
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
        G2Operations.G2Point[] memory publicValues = schainsNodesPublicKeys[groupIndex];
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

    function computePublicValues(bytes32 groupIndex, G2Operations.G2Point[] memory verificationVector)
        external
        allow("SkaleDKG")
    {
        for (uint i = 0; i < verificationVector.length; ++i) {
            if (schainsNodesPublicKeys[groupIndex].length < verificationVector.length) {
                schainsNodesPublicKeys[groupIndex].push(G2Operations.G2Point({
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
                schainsNodesPublicKeys[groupIndex][i] = G2Operations.G2Point({
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
        for (uint i = 0; i < schainsNodesPublicKeys[groupIndex].length; ++i) {
            for (uint j = 0; j < verificationVector.length; ++j) {
                require(verificationVector[j].isG2(), "Incorrect g2 point");
                schainsNodesPublicKeys[groupIndex][i] = verificationVector[j].addG2(
                    schainsNodesPublicKeys[groupIndex][i]
                );
            }
        }
    }

    function getBroadcastedData(bytes32 groupIndex, uint indexInSchain)
        external
        view
        returns (KeyShare[] memory, G2Operations.G2Point[] memory)
    {
        return (_data[groupIndex][indexInSchain].secretKeyContribution, _data[groupIndex][indexInSchain].verificationVector);
    }

    function getSecretKeyShare(bytes32 groupIndex, uint indexInSchain, uint index)
        external
        view
        returns (bytes32)
    {
        return (_data[groupIndex][indexInSchain].secretKeyContribution[index].share);
    }

    function getVerificationVector(bytes32 groupIndex, uint indexInSchain)
        external
        view
        returns (G2Operations.G2Point[] memory)
    {
        return (_data[groupIndex][indexInSchain].verificationVector);
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

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }

}