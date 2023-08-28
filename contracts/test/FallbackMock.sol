// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.17;

contract FallbackMock {

    uint256 private _minimalGasToSpend;
    uint256 private _iterator;

    constructor(uint256 minimalGasToSpend) {
        _minimalGasToSpend = minimalGasToSpend;
    }

    // solhint-disable-next-line comprehensive-interface, no-complex-fallback
    fallback() external payable {
        uint256 gasTotal = gasleft();
        while (gasTotal - gasleft() < _minimalGasToSpend) {
            _iterator++;
        }
    }
}
