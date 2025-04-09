// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.17;
// solhint-disable no-inline-assembly

contract RawStorageSetter {
    // solhint-disable-next-line comprehensive-interface
    function setStorage(bytes32 key, bytes32 value) external {
        assembly {
            // cspell:disable-next-line
            sstore(key, value)
        }
    }

    receive() external payable {}
}
