/*
    DelegationController.sol - SKALE Manager
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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./DelegationPeriodManager.sol";
import "./TokenState.sol";
import "./ValidatorService.sol";


contract DelegationController is Permissions, ILocker {

    enum State {
        PROPOSED,
        ACCEPTED,
        CANCELED,
        REJECTED,
        DELEGATED,
        UNDELEGATION_REQUESTED,
        COMPLETED
    }

    struct Delegation {
        address holder; // address of tokens owner
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        uint created; // time of creation
        uint started; // month of a delegation becomes active
        uint finished; // first month after a delegation ends
        string info;
    }

    struct Cancel {
        uint validatorId;
        uint amount;
    }

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    // ///       holder => delegationId[]
    // mapping (address => uint[]) private _activeByHolder;

    // /// validatorId => delegationId[]
    // mapping (uint => uint[]) private _activeByValidator;

    // validatorId =>        month => diff
    mapping (uint => mapping (uint => int)) private _totalDelegatedToValidatorDiff;
    // validatorId => month
    mapping (uint => uint) private _totalDelegatedToValidatorFirstUnprocessedMonth;
    // validaotrId =>        month => tokens
    mapping (uint => mapping (uint => uint)) private _totalDelegatedToValidator;

    // validatorId =>        month => diff
    mapping (uint => mapping (uint => int)) private _totalEffectiveDelegatedToValidatorDiff;
    // validatorId => month
    mapping (uint => uint) private _totalEffectiveDelegatedToValidatorFirstUnprocessedMonth;
    // validaotrId =>        month => tokens
    mapping (uint => mapping (uint => uint)) private _totalEffectiveDelegatedToValidator;

    // validatorId => tokens
    mapping (uint => uint) private _canceledFromValidator;

    //        holder =>         month => diff
    mapping (address => mapping (uint => int)) private _totalDelegatedByHolderDiff;
    //        holder => month
    mapping (address => uint) private _totalDelegatedByHolderLastProcessedMonth;
    //        holder => totalDelegatedByValidator
    mapping (address => uint) private _totalDelegatedByHolderLastValue;

    //        holder =>   validatorId => month
    mapping (address => mapping (uint => uint)) private _firstDelegationMonth;

    //        holder =>   validatorId =>         month => diff
    mapping (address => mapping (uint => mapping (uint => int))) private _effectiveDelegatedByHolderToDelegatorDiff;
    //        holder =>   validatorId => month
    mapping (address => mapping (uint => uint)) private _effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth;
    //        holder =>   validatorId =>         month => tokens
    mapping (address => mapping (uint => mapping (uint => uint))) private _effectiveDelegatedByHolderToDelegator;

    //        holder => tokens
    mapping (address => uint) private _lockedInPendingRequests;
    //        holder => month
    mapping (address => uint) private _lastWriteTolockedInPendingRequests;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    function getDelegation(uint delegationId) external view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

    function calculateTotalDelegatedToValidatorNow(uint validatorId) external allow("ValidatorService") returns (uint) {
        return calculateTotalDelegatedToValidator(validatorId, getCurrentMonth());
    }

    function calculateEffectiveDelegatedByHolderToValidator(address holder, uint validatorId, uint month) external
        allow("Distributor") returns (uint)
    {
        if (_effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId] == 0) {
            return 0;
        }

        uint currentMonth = getCurrentMonth();
        if (month >= _effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId]) {
            uint endMonth = min(currentMonth, month + 1);
            for (uint i = _effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId]; i < endMonth; ++i) {
                _effectiveDelegatedByHolderToDelegator[holder][validatorId][i] = uint(
                    int(_effectiveDelegatedByHolderToDelegator[holder][validatorId][i - 1]) + _effectiveDelegatedByHolderToDelegatorDiff[holder][validatorId][i]);
                delete _effectiveDelegatedByHolderToDelegatorDiff[holder][validatorId][i];
            }
            _effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId] = endMonth;
        }
        if (month < currentMonth) {
            return _effectiveDelegatedByHolderToDelegator[holder][validatorId][month];
        } else {
            uint delegated = _effectiveDelegatedByHolderToDelegator[holder][validatorId][currentMonth - 1];
            for (uint i = currentMonth; i <= month; ++i) {
                delegated = uint(int(delegated) + _effectiveDelegatedByHolderToDelegatorDiff[holder][validatorId][i]);
            }
            return delegated;
        }
    }

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
        allow("DelegationService")
        returns (uint delegationId)
    {
        delegationId = delegations.length;
        delegations.push(Delegation(
            holder,
            validatorId,
            amount,
            delegationPeriod,
            now,
            0,
            0,
            info
        ));
        // _activeByHolder[holder].push(delegationId);
        // _activeByValidator[validatorId].push(delegationId);
        addToLockedInPendingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);
    }

    function calculateLockedAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function cancel(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.PROPOSED, "Token holders able to cancel only PROPOSED delegations");
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint currentMonth = timeHelpers.timestampToMonth(now);
        delegations[delegationId].finished = currentMonth;
    }

    /// @notice Allows validator to accept tokens delegated at `delegationId`
    function acceptPendingDelegation(uint delegationId) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(
            validatorService.checkValidatorAddressToId(msg.sender, delegations[delegationId].validatorId),
            "No permissions to accept request");
        require(getState(delegationId) == State.PROPOSED, "Can't set state to accepted");

        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));

        uint currentMonth = timeHelpers.timestampToMonth(now);
        delegations[delegationId].started = currentMonth + 1;
        addToDelegatedToValidator(delegations[delegationId].validatorId, delegations[delegationId].amount, currentMonth + 1);
        addToHolder(delegations[delegationId].holder, delegations[delegationId].amount, currentMonth + 1);
        updateFirstDelegationMonth(delegations[delegationId].holder, delegations[delegationId].validatorId, currentMonth + 1);
        uint effectiveAmount = delegations[delegationId].amount * delegationPeriodManager.stakeMultipliers(
            delegations[delegationId].delegationPeriod);
        addToEffectiveDelegatedToValidator(
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth + 1);
        addToEffectiveHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth + 1);
    }

    function requestUndelegation(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.ACCEPTED, "Can't request undelegation");
        delegations[delegationId].finished = calculateDelegationEndMonth(delegationId);
        substractFromLockedInPerdingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);
    }

    function getFirstDelegationMonth(address holder, uint validatorId) external view returns(uint) {
        return _firstDelegationMonth[holder][validatorId];
    }

    function cancel(uint validatorId, uint amount) external allow("Punisher") {
        uint currentMonth = getCurrentMonth();

        removeFromTotalEffectiveDelegatedToValidator(validatorId, amount, currentMonth);
        removeFromTotalDelegatedToValidator(validatorId, amount, currentMonth);
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
    }

    function calculateTotalDelegatedToValidator(uint validatorId, uint month) public allow("ValidatorService") returns (uint) {
        if (_totalDelegatedToValidatorFirstUnprocessedMonth[validatorId] == 0) {
            return 0;
        }

        uint currentMonth = getCurrentMonth();
        if (month >= _totalDelegatedToValidatorFirstUnprocessedMonth[validatorId]) {
            uint endMonth = min(currentMonth, month + 1);
            for (uint i = _totalDelegatedToValidatorFirstUnprocessedMonth[validatorId]; i < endMonth; ++i) {
                _totalDelegatedToValidator[validatorId][i] = uint(
                    int(_totalDelegatedToValidator[validatorId][i - 1]) + _totalDelegatedToValidatorDiff[validatorId][i]);
                delete _totalDelegatedToValidatorDiff[validatorId][i];
            }
            _totalDelegatedToValidatorFirstUnprocessedMonth[validatorId] = endMonth;
        }
        if (month < currentMonth) {
            return _totalDelegatedToValidator[validatorId][month];
        } else {
            uint delegated = _totalDelegatedToValidator[validatorId][currentMonth - 1];
            for (uint i = currentMonth; i <= month; ++i) {
                delegated = uint(int(delegated) + _totalDelegatedToValidatorDiff[validatorId][i]);
            }
            return delegated;
        }
    }

    function calculateTotalEffectiveDelegatedToValidator(uint validatorId, uint month)
        public allow("Distributor") returns (uint)
    {
        if (_totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId] == 0) {
            return 0;
        }

        uint currentMonth = getCurrentMonth();
        if (month >= _totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId]) {
            uint endMonth = min(currentMonth, month + 1);
            for (uint i = _totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId]; i < endMonth; ++i) {
                _totalEffectiveDelegatedToValidator[validatorId][i] = uint(
                    int(_totalEffectiveDelegatedToValidator[validatorId][i - 1]) + _totalEffectiveDelegatedToValidatorDiff[validatorId][i]);
                delete _totalEffectiveDelegatedToValidatorDiff[validatorId][i];
            }
            _totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId] = endMonth;
        }
        if (month < currentMonth) {
            return _totalEffectiveDelegatedToValidator[validatorId][month];
        } else {
            uint delegated = _totalEffectiveDelegatedToValidator[validatorId][currentMonth - 1];
            for (uint i = currentMonth; i <= month; ++i) {
                delegated = uint(int(delegated) + _totalEffectiveDelegatedToValidatorDiff[validatorId][i]);
            }
            return delegated;
        }
    }

    function getState(uint delegationId) public view returns (State state) {
        if (delegations[delegationId].started == 0) {
            if (delegations[delegationId].finished == 0) {
                TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
                if (now < timeHelpers.getNextMonthStartFromDate(delegations[delegationId].created)) {
                    return State.PROPOSED;
                } else {
                    return State.REJECTED;
                }
            } else {
                return State.CANCELED;
            }
        } else {
            TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
            if (now < timeHelpers.monthToTimestamp(delegations[delegationId].started)) {
                return State.ACCEPTED;
            } else {
                if (delegations[delegationId].finished == 0) {
                    return State.DELEGATED;
                } else {
                    if (now < timeHelpers.monthToTimestamp(delegations[delegationId].finished)) {
                        return State.UNDELEGATION_REQUESTED;
                    } else {
                        return State.COMPLETED;
                    }
                }
            }
        }
    }

    // private

    function isTerminated(State state) internal pure returns (bool) {
        return state == State.COMPLETED || state == State.REJECTED;
    }

    function isLocked(State state) internal pure returns (bool) {
        return !isTerminated(state);
    }

    function isDelegated(State state) internal pure returns (bool) {
        return state == State.DELEGATED || state == State.UNDELEGATION_REQUESTED;
    }

    function calculateDelegationEndMonth(uint delegationId) internal view returns (uint) {
        revert("calculateDelegationEndMonth is not implemented");
    }

    function addToDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        _totalDelegatedToValidatorDiff[validatorId][month] += int(amount);
        if (_totalDelegatedToValidatorFirstUnprocessedMonth[validatorId] == 0) {
            _totalDelegatedToValidatorFirstUnprocessedMonth[validatorId] = month;
        } else {
            require(_totalDelegatedToValidatorFirstUnprocessedMonth[validatorId] <= month, "Can't change past delegations");
        }
    }

    function addToEffectiveDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        _totalEffectiveDelegatedToValidatorDiff[validatorId][month] += int(amount);
        if (_totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId] == 0) {
            _totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId] = month;
        } else {
            require(_totalEffectiveDelegatedToValidatorFirstUnprocessedMonth[validatorId] <= month, "Can't change past delegations");
        }
    }

    function addToHolder(address holder, uint amount, uint month) internal {
        _totalDelegatedByHolderDiff[holder][month] += int(amount);
    }

    function addToEffectiveHolderToValidator(
        address holder,
        uint validatorId,
        uint amount,
        uint month)
        internal
    {
        _effectiveDelegatedByHolderToDelegatorDiff[holder][validatorId][month] += int(amount);
        if (_effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId] == 0) {
            _effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId] = month;
        } else {
            require(_effectiveDelegatedByHolderToDelegatorFirstUnprocessedMonth[holder][validatorId] <= month, "Can't change past delegations");
        }
    }

    function calculateTotalDelegatedByHolder(address holder) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        for (uint i = _totalDelegatedByHolderLastProcessedMonth[holder] + 1; i < currentMonth; ++i) {
            _totalDelegatedByHolderLastValue[holder] = uint(
                int(_totalDelegatedByHolderLastValue[holder]) + _totalDelegatedByHolderDiff[holder][i]);
        }
        _totalDelegatedByHolderLastProcessedMonth[holder] = currentMonth - 1;
        return uint(int(_totalDelegatedByHolderLastValue[holder]) + _totalDelegatedByHolderDiff[holder][currentMonth]);
    }

    function getLockedInPendingDelegations(address holder) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        if (_lastWriteTolockedInPendingRequests[holder] < currentMonth) {
            return 0;
        } else {
            return _lockedInPendingRequests[holder];
        }
    }

    function addToLockedInPendingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        if (_lastWriteTolockedInPendingRequests[holder] < currentMonth) {
            _lockedInPendingRequests[holder] = 0;
        }
        _lockedInPendingRequests[holder] += amount;
        _lastWriteTolockedInPendingRequests[holder] = currentMonth;
    }

    function substractFromLockedInPerdingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        require(_lastWriteTolockedInPendingRequests[holder] == currentMonth, "There are no delegation requests this month");
        require(_lockedInPendingRequests[holder] >= amount, "Unlocking amount is too big");
        _lockedInPendingRequests[holder] -= amount;
    }

    function getCurrentMonth() internal returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        return timeHelpers.timestampToMonth(now);
    }

    function _calculateLockedAmount(address wallet) internal returns (uint) {
        return calculateTotalDelegatedByHolder(wallet) + getLockedInPendingDelegations(wallet);
    }

    function min(uint a, uint b) internal returns (uint) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }

    function updateFirstDelegationMonth(address holder, uint validatorId, uint month) internal {
        if (_firstDelegationMonth[holder][validatorId] == 0) {
            _firstDelegationMonth[holder][validatorId] = month;
        }
    }

    function removeFromTotalDelegatedToValidator(uint validatorId, uint amount, uint currentMonth) internal {
        _totalDelegatedToValidatorDiff[validatorId][currentMonth] -= int(amount);
    }

    function removeFromTotalEffectiveDelegatedToValidator(uint validatorId, uint amount, uint currentMonth) internal {
        uint currentEffectiveDelegated = calculateTotalEffectiveDelegatedToValidator(validatorId, currentMonth);
        uint currentDelegated = calculateTotalDelegatedToValidator(validatorId, currentMonth);
        uint effectiveAmount = currentEffectiveDelegated * amount / currentDelegated;

        _totalEffectiveDelegatedToValidatorDiff[validatorId][currentMonth] -= int(effectiveAmount);
    }
}
