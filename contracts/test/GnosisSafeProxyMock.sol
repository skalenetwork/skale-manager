// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.11;

contract GnosisSafeProxyMock {
    // singleton always needs to be first declared variable, 
    // to ensure that it is at the same location in the contracts to which calls are delegated.
    // To reduce deployment costs this variable is internal and needs to be retrieved via `getStorageAt`
    address internal _singleton;

    /// @dev Constructor function sets address of singleton contract.
    /// @param singleton Singleton address.
    constructor(address singleton) {
        require(singleton != address(0), "Invalid singleton address provided");
        _singleton = singleton;
    }

    /// @dev Fallback function forwards all transactions and returns all received return data.
    // solhint-disable-next-line comprehensive-interface
    fallback() external payable {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let singleton := and(sload(0), 0xffffffffffffffffffffffffffffffffffffffff)
            // 0xa619486e == keccak("masterCopy()"). The value is right padded to 32-bytes with 0s
            if eq(calldataload(0), 0xa619486e00000000000000000000000000000000000000000000000000000000) {
                mstore(0, singleton)
                return(0, 0x20)
            }
            calldatacopy(0, 0, calldatasize())
            let success := delegatecall(gas(), singleton, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            if eq(success, 0) {
                revert(0, returndatasize())
            }
            return(0, returndatasize())
        }
    }
}