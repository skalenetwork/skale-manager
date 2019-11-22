/*
    SkaleToken.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin
    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.
    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.5.0;


import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "./Permissions.sol";
import "./interfaces/delegation/IDelegatableToken.sol";


/**
 * @title SkaleToken is ERC777 Token implementation, also this contract in skale
 * manager system
 */
contract SkaleToken is ERC777, Permissions, IDelegatableToken {

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

    /// @notice move `amount` of tokens to SkaleManager
    function slash(address target, uint amount) external {
        revert("Not implemented");
    }

    function isLocked() external returns (bool) {
        revert("Not implemented");
    }
}
