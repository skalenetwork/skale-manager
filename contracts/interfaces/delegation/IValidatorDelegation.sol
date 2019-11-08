pragma solidity ^0.5.3;

interface IValidatorDelegation {
    /// @notice Allows validator to accept tokens delegated at `requestId`
    function accept(uint requestId) external;

    /// @notice Sets persent of bounty taken by validator
    function setFee(uint fee) external;

    /// @notice Adds node to SKALE network
    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp) external;

    /// @notice Register address as validator
    function register(string calldata name, string calldata description) external;

    function setMinimumDelegationAmount(uint amount) external;
}