pragma solidity ^0.5.3;

interface IHolderDelegation {
    /// @notice Allows tokens holder to request return of it's token from validator
    function requestUndelegation(address validator, uint amount) external;
}