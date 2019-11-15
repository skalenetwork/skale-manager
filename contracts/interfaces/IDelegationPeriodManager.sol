pragma solidity ^0.5.3;

interface IDelegationPeriodManager {
    function isDelegationPeriodAllowed(uint monthsCount) external view returns (bool);
}
