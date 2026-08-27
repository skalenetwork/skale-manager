// SPDX-License-Identifier: AGPL-3.0-only

// cspell:words IDKR

pragma solidity 0.8.35;

import { DKR, DkrId } from "../DKR.sol";
import { IDKRTester } from "./interfaces/IDKRTester.sol";

/// @dev Test-only extension of DKR that exposes helper entry points used by integration tests.
contract DKRTester is DKR, IDKRTester {
    function initializeTester(address contractManagerAddress) external override initializer {
        DKR.initialize(contractManagerAddress);
    }

    function setSuccessfulDkrPublic(DkrId id) external override {
        _setSuccessfulDkr(id);
    }

    function getPreviousDkrId(DkrId id) external view override returns (DkrId previousId) {
        return _getPreviousDkrId(id);
    }
}
