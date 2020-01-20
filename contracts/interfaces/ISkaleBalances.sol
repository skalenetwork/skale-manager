pragma solidity ^0.5.3;

interface ISkaleBalances {
    function withdrawBalance(address wallet, address to, uint amountOfTokens) external;
    function withdrawBalanceWithData(address wallet, address to, uint amountOfTokens, bytes calldata data) external;
}
