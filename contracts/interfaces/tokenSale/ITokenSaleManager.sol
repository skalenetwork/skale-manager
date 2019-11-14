pragma solidity ^0.5.3;

interface ITokenSaleManager {
    /// @notice Transfers `value` of tokens to `recipient` and locks them
    function transferAndLock(address recipient, uint value) external;

    /// @notice Transfers `value` of tokens to `recipient`
    function transfer(address recipient, uint value) external;
}