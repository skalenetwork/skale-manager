pragma solidity ^0.5.0;


import "./StandardToken.sol";
import "./Permissions.sol";


/**
 * @title SkaleToken is ERC223 Token implementation, also this contract in skale
 * manager system
 */
contract SkaleToken is StandardToken, Permissions {

    string public constant NAME = "SKALE";

    string public constant SYMBOL = "SKL";

    uint public constant DECIMALS = 18;

    uint public constant CAP = 5000000000 * (10 ** DECIMALS); // the maximum amount of tokens that can ever be created

    event Mint(address indexed to, uint256 amount, uint32 time, uint gasSpend);

    event Burn(address indexed from, uint256 amount, uint32 time, uint gasSpend);

    constructor(address contractsAddress) Permissions(contractsAddress) public {
        totalSupply = 1000000 * 10 ** DECIMALS;
        balances[msg.sender] = 1000000 * 10 ** DECIMALS;
        // TODO remove after testing
    }

    /**
     * @dev mint - create some amount of token to specify address
     * @param to - address where some amount of token would be created
     * @param amount - current amount of token
     */
    function mint(address to, uint256 amount)
        public
        allow("SkaleManager")
        //onlyAuthorized
        returns (bool)
    {
        require(amount <= CAP - totalSupply, "Amount is too big");
        totalSupply = totalSupply + amount;
        balances[to] = balances[to] + amount;
        emit Mint(
            to,
            amount,
            uint32(block.timestamp),
            gasleft());
        return true;
    }

    /**
     * @dev burn - burn some amount of token at specify address
     * @param from - address where some amount of token would be burned
     * @param amount - current amount of token
     */
    function burn(address from, uint256 amount)
        public
        allow("SkaleManager")
        //onlyAuthorized
        returns (bool)
    {
        require(balances[from] >= amount, "Amount is too big");
        balances[from] = balances[from] - amount;
        totalSupply = totalSupply - amount;
        emit Burn(
            from,
            amount,
            uint32(block.timestamp),
            gasleft());
        return true;
    }

    /**
     * @dev Function that is called when a user or another contract wants to transfer funds.
     * It is alias for transfer function of StandardToken
     * @param _to Address of token receiver.
     * @param _value Number of tokens to transfer.
     * @param _data Data to be sent to tokenFallback
     * @return Returns success of function call.
     */
    function transferWithData(
        address _to,
        uint256 _value,
        bytes memory _data
	)
        public
        returns (bool)
    {
        transfer(_to, _value, _data);
    }
}
