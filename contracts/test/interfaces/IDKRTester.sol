// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.35;

import { DkrId } from "../../DKR.sol";

interface IDKRTester {
    function initializeTester(address contractManagerAddress) external;
    function setSuccessfulDkrPublic(DkrId id) external;
}
