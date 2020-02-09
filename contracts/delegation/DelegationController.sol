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


contract DelegationController is Permissions {

    enum State {
        PROPOSED,
        ACCEPTED,
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

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    ///       holder => delegationId[]
    mapping (address => uint[]) private _activeByHolder;

    /// validatorId => delegationId[]
    mapping (uint => uint[]) private _activeByValidator;

    //validatorId => sum of tokens each holder
    mapping (uint => uint) private _delegationsTotal;

    // validatorId =>        month => diff
    mapping (uint => mapping (uint => int)) private _totalDelegatedByValidatorDiff;
    // validatorId => month
    mapping (uint => uint) private _totalDelegatedByValidatorLastProcessedMonth;
    // validaotrId => totalDelegatedByValidator
    mapping (uint => uint) private _totalDelegatedByValidatorLastValue;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    function getDelegation(uint delegationId) external view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

    function calculateTotalDelegated(uint validatorId) external allow("ValidatorService") returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint currentMonth = timeHelpers.timestampToMonth(now);
        for (uint i = _totalDelegatedByValidatorLastProcessedMonth[validatorId] + 1; i < currentMonth; ++i) {
            _totalDelegatedByValidatorLastValue[validatorId] = uint(
                int(_totalDelegatedByValidatorLastValue[validatorId]) + _totalDelegatedByValidatorDiff[validatorId][i]);
        }
        _totalDelegatedByValidatorLastProcessedMonth[validatorId] = currentMonth - 1;
        return uint(int(_totalDelegatedByValidatorLastValue[validatorId]) + _totalDelegatedByValidatorDiff[validatorId][currentMonth]);
    }

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
        allow("DelegationRequestManager")
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
        _activeByHolder[holder].push(delegationId);
        _activeByValidator[validatorId].push(delegationId);
    }

    // function getActiveDelegationsByHolder(address holder) external view allow("TokenState") returns (uint[] memory) {
    //     uint activeAmount = 0;
    //     for (uint i = 0; i < _activeByHolder[holder].length;) {
    //         TokenState.State state = getState(_activeByValidator[validatorId][i]);
    //         if (!isActive(state)) {
    //             // remove from list
    //             _activeByHolder[holder][i] = _activeByHolder[holder][_activeByHolder[holder].length - 1];
    //             delete _activeByHolder[holder][_activeByHolder[holder].length - 1];
    //             --_activeByHolder[holder].length;
    //         } else {
    //             if (tokenState.isDelegated(state)) {
    //                 ++activeAmount;
    //             }
    //             ++i;
    //         }
    //     }

    //     uint[] memory active = new uint[](activeAmount);
    //     uint cursor = 0;
    //     for (uint i = 0; i < _activeByValidator[validatorId].length; ++i) {
    //         if (tokenState.isDelegated(tokenState.getState(_activeByValidator[validatorId][i]))) {
    //             require(cursor < active.length, "Out of index");
    //             active[cursor] = _activeByValidator[validatorId][i];
    //             ++cursor;
    //         }
    //     }

    //     return active;
    // }

    // function getActiveDelegationsByValidator(uint validatorId) external allow("Distributor") returns (uint[] memory) {
    //     TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
    //     uint activeAmount = 0;
    //     for (uint i = 0; i < _activeByValidator[validatorId].length;) {
    //         TokenState.State state = tokenState.getState(_activeByValidator[validatorId][i]);
    //         if (state == TokenState.State.COMPLETED) {
    //             // remove from list
    //             _activeByValidator[validatorId][i] = _activeByValidator[validatorId][_activeByValidator[validatorId].length - 1];
    //             _activeByValidator[validatorId][_activeByValidator[validatorId].length - 1] = 0;
    //             --_activeByValidator[validatorId].length;
    //         } else {
    //             if (tokenState.isDelegated(state)) {
    //                 ++activeAmount;
    //             }
    //             ++i;
    //         }
    //     }

    //     uint[] memory active = new uint[](activeAmount);
    //     uint cursor = 0;
    //     for (uint i = 0; i < _activeByValidator[validatorId].length; ++i) {
    //         if (tokenState.isDelegated(tokenState.getState(_activeByValidator[validatorId][i]))) {
    //             require(cursor < active.length, "Out of index");
    //             active[cursor] = _activeByValidator[validatorId][i];
    //             ++cursor;
    //         }
    //     }

    //     return active;
    // }

    // function getDelegationsByHolder(address holderAddress, TokenState.State _state)
    //     external
    //     allow("DelegationService")
    //     returns (uint[] memory)
    // {
    //     TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
    //     uint delegationsAmount = 0;
    //     for (uint i = 0; i < _activeByHolder[holderAddress].length; i++) {
    //         TokenState.State state = tokenState.getState(_activeByHolder[holderAddress][i]);
    //         if (state == _state) {
    //             ++delegationsAmount;
    //         }
    //     }

    //     uint[] memory delegationsHolder = new uint[](delegationsAmount);
    //     uint cursor = 0;
    //     for (uint i = 0; i < _activeByHolder[holderAddress].length; i++) {
    //         if (_state == tokenState.getState(_activeByHolder[holderAddress][i])) {
    //             require(cursor < delegationsHolder.length, "Out of index");
    //             delegationsHolder[cursor] = _activeByHolder[holderAddress][i];
    //             ++cursor;
    //         }
    //     }
    //     return delegationsHolder;
    // }

    // function getDelegationsForValidator(address validatorAddress, TokenState.State _state)
    //     external
    //     allow("DelegationService")
    //     returns (uint[] memory)
    // {
    //     TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
    //     ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
    //     uint validatorId = validatorService.getValidatorId(validatorAddress);
    //     uint delegationsAmount = 0;
    //     for (uint i = 0; i < _activeByValidator[validatorId].length; i++) {
    //         TokenState.State state = tokenState.getState(_activeByValidator[validatorId][i]);
    //         if (state == _state) {
    //             ++delegationsAmount;
    //         }
    //     }

    //     uint[] memory delegationsValidator = new uint[](delegationsAmount);
    //     uint cursor = 0;
    //     for (uint i = 0; i < _activeByValidator[validatorId].length; i++) {
    //         if (_state == tokenState.getState(_activeByValidator[validatorId][i])) {
    //             require(cursor < delegationsValidator.length, "Out of index");
    //             delegationsValidator[cursor] = _activeByValidator[validatorId][i];
    //             ++cursor;
    //         }
    //     }
    //     return delegationsValidator;
    // }

    function cancel(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.PROPOSED, "Token holders able to cancel only PROPOSED delegations");
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint currentMonth = timeHelpers.timestampToMonth(now);
        delegations[delegationId].finished = currentMonth;
    }

    function accept(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.PROPOSED, "Can't set state to accepted");
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint currentMonth = timeHelpers.timestampToMonth(now);
        delegations[delegationId].started = currentMonth + 1;
        addDelegation(delegations[delegationId].validatorId, delegations[delegationId].amount, currentMonth + 1);
    }

    function requestUndelegation(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.DELEGATED, "Can't request undelegation");
        delegations[delegationId].finished = calculateDelegationEndMonth(delegationId);
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
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
                return State.REJECTED;
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

    function addDelegation(uint validatorId, uint amount, uint month) internal {
        _totalDelegatedByValidatorDiff[validatorId][month] += int(amount);
    }
}
