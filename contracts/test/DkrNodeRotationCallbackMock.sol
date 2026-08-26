// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.35;

import { IDkrNodeRotation } from "../DKR.sol";

interface IDkrNodeRotationCallbackMock {
    function finalizeRotation(IDkrNodeRotation nodeRotation, bytes32 schainHash) external;
    function failDkr(IDkrNodeRotation nodeRotation, uint256 dkrId, uint256 badNode) external;
}

/// @dev Test-only DKR used to simulate DKR-originated NodeRotation callbacks.
contract DkrNodeRotationCallbackMock is IDkrNodeRotationCallbackMock {
    function finalizeRotation(IDkrNodeRotation nodeRotation, bytes32 schainHash) external override {
        nodeRotation.finalizeRotation(schainHash);
    }

    function failDkr(
        IDkrNodeRotation nodeRotation,
        uint256 dkrId,
        uint256 badNode
    )
        external
        override
    {
        nodeRotation.failDkr(dkrId, badNode);
    }
}
