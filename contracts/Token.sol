/**
 * Abstract contract for the full ERC 20 & ERC 223 Token standards
 * https://github.com/ethereum/EIPs/issues/20
 * https://github.com/ethereum/EIPs/issues/223
 */
pragma solidity ^0.5.0;


contract Token {

    /**
     * This is a slight change to the ERC20 base standard.
     * function totalSupply() constant returns (uint256 supply);
     * is replaced with:
     * uint256 public totalSupply;
     * This automatically creates a getter function for the totalSupply.
     * This is moved to the base contract since public getter functions are not
     * currently recognised as an implementation of the matching abstract
     * function by the compiler.
     */
    // Total amount of tokens
    uint256 public totalSupply;

    /**
     * @param owner The address from which the balance will be retrieved.
     * @return The balance.
     */
    function balanceOf(address owner) public view returns (uint256 balance);

    /**
     * @notice send `value` token to `to` from `msg.sender`.
     * @param to The address of the recipient.
     * @param value The amount of token to be transferred.
     * @param data Data to be sent to `tokenFallback.
     * @return Returns success of function call.
     */
    function transfer(address to, uint256 value, bytes memory data) public returns (bool success);

    /**
     * @notice send `value` token to `to` from `msg.sender`.
     * @param to The address of the recipient.
     * @param value The amount of token to be transferred.
     * @return Whether the transfer was successful or not.
     */
    function transfer(address to, uint256 value) public returns (bool success);

    /**
     * @notice send `value` token to `to` from `from` on the condition it is approved by `from`.
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param value The amount of token to be transferred.
     * @return Whether the transfer was successful or not.
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool success);

    /**
     * @notice `msg.sender` approves `spender` to spend `value` tokens.
     * @param spender The address of the account able to transfer the tokens.
     * @param value The amount of tokens to be approved for transfer.
     * @return Whether the approval was successful or not.
     */
    function approve(address spender, uint256 value) public returns (bool success);

    /**
     * @param owner The address of the account owning tokens.
     * @param spender The address of the account able to transfer the tokens.
     * @return Amount of remaining tokens allowed to spent.
     */
    function allowance(address owner, address spender) public view returns (uint256 remaining);

    event Transfer(address indexed from, address indexed to, uint256 value, bytes data, uint32 time, uint gasSpend);
    event Approval(address indexed owner, address indexed spender, uint256 value, uint32 time, uint gasSpend);
}
