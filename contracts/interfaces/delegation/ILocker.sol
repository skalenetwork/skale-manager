pragma solidity ^0.5.3;


interface ILocker {
    function getAndUpdateLockedAmount(address wallet) external returns (uint);
    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint);
}
