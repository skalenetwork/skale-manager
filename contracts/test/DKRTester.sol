// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.35;

import { DKR, DkrId } from "../DKR.sol";
import { IDKRTester } from "./interfaces/IDKRTester.sol";

contract DKRTester is DKR, IDKRTester {
    function initializeTester(address contractManagerAddress) external override initializer {
        DKR.initialize(contractManagerAddress);
    }

    function setSuccessfulDkrPublic(DkrId id) external override {
        _setSuccessfulDkr(id);
    }
}
