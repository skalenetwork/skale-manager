// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.35;

import { IDkrNodeRotation, DkrId } from "../DKR.sol";

interface IDkrNodeRotationCallbackMock {
    function failDkr(IDkrNodeRotation nodeRotation, DkrId dkrId, uint256 badNode) external;
    function successDkr(IDkrNodeRotation nodeRotation, DkrId dkrId) external;
}

/// @dev Test-only DKR used to simulate DKR-originated NodeRotation callbacks.
contract DkrNodeRotationCallbackMock is IDkrNodeRotationCallbackMock {
    function successDkr(IDkrNodeRotation nodeRotation, DkrId dkrId) external override {
        nodeRotation.successDkr(dkrId);
    }

    function failDkr(
        IDkrNodeRotation nodeRotation,
        DkrId dkrId,
        uint256 badNode
    )
        external
        override
    {
        nodeRotation.failDkr(dkrId, badNode);
    }
}
