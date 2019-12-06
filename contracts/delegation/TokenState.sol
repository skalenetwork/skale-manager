/*
    TokenState.sol - SKALE Manager
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
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./DelegationController.sol";
import "./TimeHelpers.sol";


/// @notice Store and manage tokens states
contract TokenState is Permissions {

    enum State {
        NONE,
        UNLOCKED,
        PROPOSED,
        ACCEPTED,
        DELEGATED,
        ENDING_DELEGATED,
        PURCHASED,
        PURCHASED_PROPOSED
    }

    ///delegationId => State
    mapping (uint => State) private _state;

    /// delegationId => timestamp
    mapping (uint => uint) private _timelimit;

    ///       holder => amount
    mapping (address => uint) private _purchased;
    ///       holder => amount
    mapping (address => uint) private _totalDelegated;

    constructor(address _contractManager) Permissions(_contractManager) public {
    }

    function getLockedCount(address holder) external returns (uint amount) {
        amount = 0;
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        uint[] memory delegationIds = delegationController.getDelegationsByHolder(holder);
        for (uint i = 0; i < delegationIds.length; ++i) {
            uint id = delegationIds[i];
            if (isLocked(getState(id))) {
                amount += delegationController.getDelegation(id).amount;
            }
        }
        return amount + getPurchasedAmount(holder);
    }

    function getDelegatedCount(address holder) external returns (uint amount) {
        amount = 0;
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        uint[] memory delegationIds = delegationController.getDelegationsByHolder(holder);
        for (uint i = 0; i < delegationIds.length; ++i) {
            uint id = delegationIds[i];
            if (isDelegated(getState(id))) {
                amount += delegationController.getDelegation(id).amount;
            }
        }
        return amount;
    }

    function setState(uint delegationId, State newState) external {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        if (newState == State.PROPOSED || newState == State.PURCHASED_PROPOSED) {
            revert("Use delegate function instead");
        } else if (newState == State.PURCHASED) {
            revert("Use setPurchased function instead");
        } else if (newState == State.ACCEPTED) {
            State currentState = getState(delegationId);
            if (currentState != State.PROPOSED && currentState != State.PURCHASED_PROPOSED) {
                revert("Can't set state to accepted");
            }
            _state[delegationId] = State.ACCEPTED;
            _timelimit[delegationId] = timeHelpers.getNextMonthStart();
        } else if (newState == State.DELEGATED) {
            revert("Can't set state to delegated");
        } else if (newState == State.ENDING_DELEGATED) {
            if (getState(delegationId) != State.DELEGATED) {
                revert("Can't set state to ending delegated");
            }
            DelegationController.Delegation memory delegation = delegationController.getDelegation(delegationId);

            _state[delegationId] = State.ENDING_DELEGATED;
            _timelimit[delegationId] = timeHelpers.calculateDelegationEndTime(delegation.created, delegation.delegationPeriod, 3);
        } else if (newState == State.UNLOCKED) {
            revert("Can't set state to unlocked");
        } else {
            revert("Unknown state");
        }
    }

    function setPurchased(address holder, uint amount) external {
        revert("Not implemented");
    }

    function delegate(uint delegationId) external {
        revert("Delegate is not implemented");
    }

    function getState(uint delegationId) public returns (State state) {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        // TODO: Modify existance check
        require(delegationController.getDelegation(delegationId).holder != address(0), "Delegation does not exists");
        require(_state[delegationId] != State.NONE, "State is unknown");
        state = _state[delegationId];
        if (state == State.PROPOSED) {
            if (block.timestamp >= _timelimit[delegationId]) {
                state = proposedToUnlocked(delegationId);
            }
        } else if (state == State.ACCEPTED) {
            if (block.timestamp >= _timelimit[delegationId]) {
                state = acceptedToDelegated(delegationId);
            }
        } else if (state == State.PURCHASED_PROPOSED) {
            if (block.timestamp >= _timelimit[delegationId]) {
                state = purchasedProposedToPurchased(delegationId);
            }
        } else if (state == State.ENDING_DELEGATED) {
            if (block.timestamp >= _timelimit[delegationId]) {
                state = endingDelegatedToUnlocked(delegationId, delegationController.getDelegation(delegationId));
            }
        }
    }

    // private

    function isLocked(State state) internal returns (bool) {
        return state != State.UNLOCKED;
    }

    function isDelegated(State state) internal returns (bool) {
        return state == State.DELEGATED || state == State.ENDING_DELEGATED;
    }

    function getPurchasedAmount(address holder) internal returns (uint amount) {
        revert("getPurchasedAmount is not implemented");
    }

    function proposedToUnlocked(uint delegationId) internal returns (State) {
        // TODO: delete delegation
        _state[delegationId] = State.NONE;
        _timelimit[delegationId] = 0;
        return State.UNLOCKED;
    }

    function acceptedToDelegated(uint delegationId) internal returns (State) {
        State state = State.DELEGATED;
        _state[delegationId] = state;
        _timelimit[delegationId] = 0;
        return state;
    }

    function purchasedProposedToPurchased(uint delegationId) internal returns (State) {
        State state = State.PURCHASED;
        _state[delegationId] = state;
        _timelimit[delegationId] = 0;
        return state;
    }

    function endingDelegatedToUnlocked(uint delegationId, DelegationController.Delegation memory delegation) internal returns (State) {
        State state = State.UNLOCKED;
        _state[delegationId] = state;
        _timelimit[delegationId] = 0;

        if (delegation.purchased) {
            address holder = delegation.holder;
            _totalDelegated[holder] += delegation.amount;
            if (_totalDelegated[holder] >= _purchased[holder]) {
                purchasedToUnlocked(holder);
            }
        }

        return state;
    }

    function purchasedToUnlocked(address holder) internal {
        _purchased[holder] = 0;
        _totalDelegated[holder] = 0;
    }
}
