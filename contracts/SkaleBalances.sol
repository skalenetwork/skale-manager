/*
    SkaleBalances.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky

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

import "./Permissions.sol";
import "./SkaleManager.sol";
import "./interfaces/ISkaleToken.sol";


contract SkaleBalances is Permissions {
    mapping (address => uint) bountyBalances;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function rechargeBalance(address recipient, uint bountyForMiner) public allow("SkaleManager") {
        address skaleTokenAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleToken")));
        bountyBalances[recipient] += bountyForMiner;
        require(
            ISkaleToken(skaleTokenAddress).mint(
                address(0),
                skaleTokenAddress,
                bountyForMiner,
                bytes(""),
                bytes("")
            ), "Minting of token is failed"
        );
    }

    function withdrawBalance(uint amountOfTokens) public {
        require(bountyBalances[msg.sender] >= amountOfTokens, "Now enough tokens on balance for withdrawing");
        bountyBalances[msg.sender] -= amountOfTokens;
        // send(msg.sender, amountOfTokens, "");
    }
}