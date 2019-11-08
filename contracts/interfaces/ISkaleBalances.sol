pragma solidity ^0.5.0;

interface ISkaleBalances {
    function rechargeBalance(address from, uint bountyForMiner) external;
}
