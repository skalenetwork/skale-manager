pragma solidity ^0.5.0;


import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "./Permissions.sol";


/**
 * @title SkaleToken is ERC777 Token implementation, also this contract in skale
 * manager system
 */
contract SkaleToken is ERC777, Permissions {

    string public constant NAME = "SKALE";

    string public constant SYMBOL = "SKL";

    uint public constant DECIMALS = 18;

    uint public constant CAP = 5 * 1e9 * (10 ** DECIMALS); // the maximum amount of tokens that can ever be created

    constructor(address contractsAddress, address[] memory defOps) Permissions(contractsAddress) ERC777("SKALE", "SKL", defOps) public {
        uint money = 1e7 * 10 ** DECIMALS;
        _mint(
            address(0),
            address(msg.sender),
            money, bytes(""),
            bytes("")
        );
        // TODO remove after testing
    }

    /**
     * @dev mint - create some amount of token and transfer it to specify address
     * @param operator address operator requesting the transfer
     * @param account - address where some amount of token would be created
     * @param amount - amount of tokens to mine
     * @param userData bytes extra information provided by the token holder (if any)
     * @param operatorData bytes extra information provided by the operator (if any)
     * @return returns success of function call.
     */
    function mint(
        address operator,
        address account,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external
        allow("SkaleManager")
        //onlyAuthorized
        returns (bool)
    {
        require(amount <= CAP - totalSupply(), "Amount is too big");
        _mint(
            operator,
            account,
            amount,
            userData,
            operatorData
        );

        return true;
    }
}
