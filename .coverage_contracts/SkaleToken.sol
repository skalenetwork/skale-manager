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


/**
 * @title SkaleToken is ERC777 Token implementation, also this contract in skale
 * manager system
 */
contract SkaleToken is ERC777, Permissions {
function coverage_0x412b4656(bytes32 c__0x412b4656) public pure {}


    string public constant NAME = "SKALE";

    string public constant SYMBOL = "SKL";

    uint public constant DECIMALS = 18;

    uint public constant CAP = 7 * 1e9 * (10 ** DECIMALS); // the maximum amount of tokens that can ever be created

    constructor(address contractsAddress, address[] memory defOps) Permissions(contractsAddress) ERC777("SKALE", "SKL", defOps) public {coverage_0x412b4656(0x2a21076ba410e55791effedcd3450d9eb7836b5ac7a97b2042f13d0589ebadad); /* function */ 

coverage_0x412b4656(0x0e3c677470e6e15d20d2091f6d767331510dbf2d490477368a7713a4cf2a818f); /* line */ 
        coverage_0x412b4656(0x88f0488caec03c319c805ce4730fc45f5826c80d0ad07b17ae1d48be5a8c2e11); /* statement */ 
uint money = 1e7 * 10 ** DECIMALS;
coverage_0x412b4656(0xfadd0a56229eb46c1328e3a300938070ec42c8bc6f1564a598cf1d344f99ac22); /* line */ 
        coverage_0x412b4656(0xdabaecef5e08245fe551a75ca2f26765bc60fa832b5a8a66858af5b6564ff6b1); /* statement */ 
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
    {coverage_0x412b4656(0x6d5ed465864b51712a1d8f0859f09b3f637cfe8715f59adc6795aa5570dd2931); /* function */ 

coverage_0x412b4656(0xb3989980b6169153e7221d9fec2d712482105d2218430a64a7aa1460ba2a547a); /* line */ 
        coverage_0x412b4656(0xa132e60a98cf79c9d4000832ed21bd7976af01fae9091696e801896f4ffdce46); /* assertPre */ 
coverage_0x412b4656(0x3d8324fd82056f54c01e3ee1335aec72beba61671fe6e0d99d86c9edaf6083e2); /* statement */ 
require(amount <= CAP - totalSupply(), "Amount is too big");coverage_0x412b4656(0x89109d433cc09803186372ab889c305630591aa9ca1bdc5c51d8d66baf6acf6e); /* assertPost */ 

coverage_0x412b4656(0x92585e7798f64bfa370ff99c388bbe1f0bab3eb5f70648cbcbeb45c7edb60482); /* line */ 
        coverage_0x412b4656(0xf9922205ea1d3dc83ff7d8c4e5134691f59913a9b7bd13e6f0e8d6ee3729c794); /* statement */ 
_mint(
            operator,
            account,
            amount,
            userData,
            operatorData
        );

coverage_0x412b4656(0x0127fe9aa95021e143073b732bd796ac392a443935a51b1833f3fcb49abcd42f); /* line */ 
        coverage_0x412b4656(0x2a465aac792ec3577b40fe2eb485ffdfb03fbf19bbe1c61b4f3a1c991e6d356c); /* statement */ 
return true;
    }
}
