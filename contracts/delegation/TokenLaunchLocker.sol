/*
    TokenLaunchLocker.sol - SKALE Manager
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

pragma solidity 0.6.6;

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../Permissions.sol";
import "../interfaces/delegation/ILocker.sol";
import "../ConstantsHolder.sol";
import "../utils/MathUtils.sol";

import "./DelegationController.sol";
import "./TimeHelpers.sol";
import "./PartialDifferences.sol";


contract TokenLaunchLocker is Permissions, ILocker {
    using MathUtils for uint;
    using PartialDifferences for PartialDifferences.Value;

    event Unlocked(
        address holder,
        uint amount
    );

    event Locked(
        address holder,
        uint amount
    );

    struct DelegatedAmountAndMonth {
        uint delegated;
        uint month;
    }

    //        holder => tokens
    mapping (address => uint) private _locked;

    //        holder => tokens
    mapping (address => PartialDifferences.Value) private _delegatedAmount;

    mapping (address => DelegatedAmountAndMonth) private _totalDelegatedAmount;

    // delegationId => tokens
    mapping (uint => uint) private _delegationAmount;

    function lock(address holder, uint amount) external allow("TokenLaunchManager") {
        _locked[holder] = _locked[holder].add(amount);

        emit Locked(holder, amount);
    }

    function handleDelegationAdd(
        address holder, uint delegationId, uint amount, uint month)
        external allow("DelegationController")
    {
        if (_locked[holder] > 0) {
            TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

            uint currentMonth = timeHelpers.getCurrentMonth();
            uint fromLocked = amount;
            uint locked = _locked[holder].boundedSub(getAndUpdateDelegatedAmount(holder, currentMonth));
            if (fromLocked > locked) {
                fromLocked = locked;
            }
            if (fromLocked > 0) {
                require(_delegationAmount[delegationId] == 0, "Delegation already was added");
                addToDelegatedAmount(holder, fromLocked, month);
                addToTotalDelegatedAmount(holder, fromLocked, month);
                _delegationAmount[delegationId] = fromLocked;
            }
        }
    }

    function handleDelegationRemoving(
        address holder,
        uint delegationId,
        uint month)
        external allow("DelegationController")
    {
        if (_delegationAmount[delegationId] > 0) {
            if (_locked[holder] > 0) {
                removeFromDelegatedAmount(holder, _delegationAmount[delegationId], month);
            }
            delete _delegationAmount[delegationId];
        }
    }

    function getAndUpdateLockedAmount(address wallet) external override returns (uint) {
        if (_locked[wallet] > 0) {
            DelegationController delegationController = DelegationController(
                contractManager.getContract("DelegationController"));
            TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
            ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));

            uint currentMonth = timeHelpers.getCurrentMonth();
            if (_totalDelegatedAmount[wallet].delegated.mul(2) >= _locked[wallet] &&
                timeHelpers.calculateProofOfUseLockEndTime(
                    _totalDelegatedAmount[wallet].month,
                    constantsHolder.proofOfUseLockUpPeriodDays()
                ) <= now) {
                unlock(wallet);
                return 0;
            } else {
                uint lockedByDelegationController = getAndUpdateDelegatedAmount(wallet, currentMonth)
                    .add(delegationController.getLockedInPendingDelegations(wallet));
                if (_locked[wallet] > lockedByDelegationController) {
                    return _locked[wallet].boundedSub(lockedByDelegationController);
                } else {
                    return 0;
                }
            }
        } else {
            return 0;
        }
    }

    function getAndUpdateForbiddenForDelegationAmount(address) external override returns (uint) {
        return 0;
    }

    function initialize(address _contractManager) public override initializer {
        Permissions.initialize(_contractManager);
    }

    // private

    function getAndUpdateDelegatedAmount(address holder, uint currentMonth) internal returns (uint) {
        return _delegatedAmount[holder].getAndUpdateValue(currentMonth);
    }

    function addToDelegatedAmount(address holder, uint amount, uint month) internal {
        _delegatedAmount[holder].addToValue(amount, month);
    }

    function removeFromDelegatedAmount(address holder, uint amount, uint month) internal {
        _delegatedAmount[holder].subtractFromValue(amount, month);
    }

    function addToTotalDelegatedAmount(address holder, uint amount, uint month) internal {
        require(
            _totalDelegatedAmount[holder].month == 0 || _totalDelegatedAmount[holder].month <= month,
            "Can't add to total delegated in the past");

        // do not update counter if it is big enough
        // because it will override month value
        if (_totalDelegatedAmount[holder].delegated.mul(2) < _locked[holder]) {
            _totalDelegatedAmount[holder].delegated = _totalDelegatedAmount[holder].delegated.add(amount);
            _totalDelegatedAmount[holder].month = month;
        }
    }

    function unlock(address holder) internal {
        emit Unlocked(holder, _locked[holder]);
        delete _locked[holder];
        deleteDelegatedAmount(holder);
        deleteTotalDelegatedAmount(holder);
    }

    function deleteDelegatedAmount(address holder) internal {
        _delegatedAmount[holder].clear();
    }

    function deleteTotalDelegatedAmount(address holder) internal {
        delete _totalDelegatedAmount[holder].delegated;
        delete _totalDelegatedAmount[holder].month;
    }
}