pragma solidity ^0.5.3;

import "./interfaces/tokenSale/ITokenSaleManager.sol";


contract TokenSaleManager is ITokenSaleManager {
    /// @notice Allocates values for `walletAddresses`
    function approve(address[] calldata walletAddress, uint[] calldata value) external {
        revert("Not implemented");
    }

    /// @notice Transfers the entire value to sender address. Tokens are locked.
    function retrieve() external {
        revert("Not implemented");
    }

    /// @notice Transfers `delegationValue` of tokens to `delegationWalletAddress`
    /// and creates delegation request for `delegationPeriod` with `info`
    function delegateSaleToken(
        address delegationWalletAddress,
        uint delegationValue,
        uint validatorId,
        string calldata startingMonth,
        uint delegationPeriod,
        string calldata info) external
    {
        revert("Not implemented");
    }

    function registerSeller(address seller) external {
        revert("Not implemented");
    }
}