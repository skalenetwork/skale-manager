pragma solidity ^0.5.0;

/**
 * @title Delegation - delegation operations contract interface
 */
interface IDelegation {
    function delegationRequest(address from, uint amount, bytes calldata data) external;
}