pragma solidity ^0.5.3;


interface ILocker {
    function calculateLockedAmount(address wallet) external returns (uint);
    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint);
}
