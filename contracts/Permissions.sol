// SPDX-License-Identifier: AGPL-3.0-only

/*
    Permissions.sol - SKALE Manager
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

pragma solidity 0.6.8;

import "./ContractManager.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


/**
 * @title Permissions
 * @dev Contract is connected module for Upgradeable approach, knows ContractManager
 */
contract Permissions is OwnableUpgradeSafe {
    using SafeMath for uint;
    using SafeMath for uint32;

    ContractManager internal _contractManager;

    function initialize(address contractManager) public virtual initializer {
        OwnableUpgradeSafe.__Ownable_init();
        _contractManager = ContractManager(contractManager);
    }

    modifier allow(string memory contractName) {
        require(
            _contractManager.contracts(keccak256(abi.encodePacked(contractName))) == msg.sender || _isOwner(),
            "Message sender is invalid");
        _;
    }

    modifier allowTwo(string memory contractName1, string memory contractName2) {
        require(
            _contractManager.contracts(keccak256(abi.encodePacked(contractName1))) == msg.sender ||
            _contractManager.contracts(keccak256(abi.encodePacked(contractName2))) == msg.sender ||
            _isOwner(),
            "Message sender is invalid");
        _;
    }

    modifier allowThree(string memory contractName1, string memory contractName2, string memory contractName3) {
        require(
            _contractManager.contracts(keccak256(abi.encodePacked(contractName1))) == msg.sender ||
            _contractManager.contracts(keccak256(abi.encodePacked(contractName2))) == msg.sender ||
            _contractManager.contracts(keccak256(abi.encodePacked(contractName3))) == msg.sender ||
            _isOwner(),
            "Message sender is invalid");
        _;
    }

    function _isOwner() internal view returns (bool) {
        return msg.sender == owner();
    }
}
