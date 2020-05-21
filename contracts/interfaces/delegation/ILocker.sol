pragma solidity 0.6.8;


interface ILocker {
    function getAndUpdateLockedAmount(address wallet) external returns (uint);
    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint);
}
