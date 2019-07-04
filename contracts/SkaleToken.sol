pragma solidity ^0.5.0;


import "./StandardToken.sol";
import "./Permissions.sol";


/**
 * @title SkaleToken is ERC223 Token implementation, also this contract in skale
 * manager system
 */
contract SkaleToken is StandardToken, Permissions {

    string public constant name = "SKALE";

    string public constant symbol = "SKL";

    uint public constant decimals = 18;

    uint public constant cap = 5000000000 * (10 ** decimals); // the maximum amount of tokens that can ever be created

    event Mint(address indexed to, uint256 amount, uint32 time, uint gasSpend);

    event Burn(address indexed from, uint256 amount, uint32 time, uint gasSpend);

    constructor(address contractsAddress) Permissions(contractsAddress) public {
        totalSupply = 1000000 * 10 ** decimals;
        balances[msg.sender] = 1000000 * 10 ** decimals;
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
        require(amount <= cap - totalSupply);
        totalSupply = totalSupply + amount;
        balances[to] = balances[to] + amount;
        emit Mint(to, amount, uint32(block.timestamp), gasleft());
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
        require(balances[from] >= amount);
        balances[from] = balances[from] - amount;
        totalSupply = totalSupply - amount;
        emit Burn(from, amount, uint32(block.timestamp), gasleft());
        return true;
    }
}
