pragma solidity ^0.5.3;

interface ISkaleBalances {
    function stashBalance(address from, uint bountyForMiner) external;
}
