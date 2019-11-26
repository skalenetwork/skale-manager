pragma solidity ^0.5.3;

interface ITokenSaleManager {

    /// @notice Allocates values for `walletAddresses`
    function approve(address[] calldata walletAddress, uint[] calldata value) external;

    /// @notice Transfers the entire value to sender address. Tokens are locked.
    function retrieve() external;

    /// @notice Transfers `delegationValue` of tokens to `delegationWalletAddress`
    /// and creates delegation request for `delegationPeriod` with `description`
    function delegateSaleToken(
        address delegationWalletAddress,
        uint delegationValue,
        uint validatorId,
        uint delegationPeriod,
        string calldata info) external;

    /// @notice Allows seller address to approve tokens transfers
    function registerSeller(address seller) external;
}