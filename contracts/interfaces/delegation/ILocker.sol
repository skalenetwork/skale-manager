pragma solidity 0.6.6;


interface ILocker {
    function getAndUpdateLockedAmount(address wallet) external returns (uint);
    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint);
}
