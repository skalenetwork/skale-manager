pragma solidity ^0.4.22;


import './StandardToken.sol';
import './Permissions.sol';
//import './Authorizable.sol'; 


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

    function mint(address _to, uint256 _amount)
        public
        allow("SkaleManager")
        //onlyAuthorized
        returns (bool)
    {
        require(_amount <= cap - totalSupply);
        totalSupply = totalSupply + _amount;
        balances[_to] = balances[_to] + _amount;
        emit Mint(_to, _amount, uint32(block.timestamp), gasleft());
        return true;
    }

    function burn(address _from, uint256 _amount)
        public
        allow("SkaleManager")
        //onlyAuthorized
        returns (bool)
    {
        require(balances[_from] >= _amount);
        balances[_from] = balances[_from] - _amount;
        totalSupply = totalSupply - _amount;
        emit Burn(_from, _amount, uint32(block.timestamp), gasleft());
        return true;
    }
}
