pragma solidity ^0.5.3;

interface IDelegatableToken {

    /// @notice Creates request to delegate `amount` of tokens to `validator` from the begining of the next month
    function delegate(
        address validator,
        uint delegationType,
        string calldata info,
        address bountyReceiver) external returns(uint requestId);

    /// @notice move `amount` of tokens to SkaleManager
    function slash(address target, uint amount) external;
}