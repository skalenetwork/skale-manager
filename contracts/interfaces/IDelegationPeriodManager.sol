pragma solidity ^0.5.0;

interface IDelegationPeriodManager {
    function isDelegationPeriodAllowed(uint monthsCount) external view returns (bool);
}
