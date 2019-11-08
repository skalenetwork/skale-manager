pragma solidity ^0.5.3;

interface IManagerDelegation {
    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(address validator, uint amount) external;

    /// @notice Allows service to pay `amount` of tokens to `validator`
    function pay(address validator, uint amount) external;

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(address validator) external returns (uint);

    function setMinimumStakingRequirement(uint amount) external;
}