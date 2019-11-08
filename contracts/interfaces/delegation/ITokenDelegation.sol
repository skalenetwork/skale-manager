pragma solidity ^0.5.3;

interface ITokenDelegation {

    /// @notice Checks if tokens of the sender is locked
    function isLocked() external returns (bool);
}