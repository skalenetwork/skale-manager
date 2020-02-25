/*
    Punisher.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Dmytro Stebaiev

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

pragma solidity ^0.5.3;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../Permissions.sol";
import "../interfaces/delegation/ILocker.sol";

import "./ValidatorService.sol";
import "./DelegationController.sol";


contract Punisher is Permissions, ILocker {

    //        holder => tokens
    mapping (address => uint) private _locked;

    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(uint validatorId, uint amount) external allow("SkaleDKG") {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(validatorService.validatorExists(validatorId), "Validator does not exist");

        delegationController.confiscate(validatorId, amount);
    }

    function forgive(address holder, uint amount) external onlyOwner {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(!delegationController.hasUnprocessedSlashes(holder), "Not all slashes were calculated");

        if (amount > _locked[holder]) {
            delete _locked[holder];
        } else {
            _locked[holder] = _locked[holder].sub(amount);
        }
    }

    function calculateLockedAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function handleSlash(address holder, uint amount) external allow("DelegationController") {
        _locked[holder] = _locked[holder].add(amount);
    }

    function initialize(address _contractManager) public initializer {
        Permissions.initialize(_contractManager);
    }

    // private

    function _calculateLockedAmount(address wallet) internal returns (uint) {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        delegationController.processAllSlashes(wallet);
        return _locked[wallet];
    }

}