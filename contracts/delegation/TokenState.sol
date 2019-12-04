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


/// @notice Store and manage tokens states
contract TokenState {

    enum State {
        UNLOCKED,
        PROPOSED,
        ACCEPTED,
        DELEGATED,
        ENDING_DELEGATED,
        PURCHASED,
        PURCHASED_PROPOSED
    }

    // get state

    function getLockedCount(address holder) external returns (uint amount) {
        revert("getLockedCount is not implemented");
    }

    function getDelegatedCount(address holder) external returns (uint amount) {
        revert("getLockedCount is not implemented");
    }

    function getState(uint delegationId) external returns (State state) {
        revert("Not implemented");
    }

    // modify state

    function setState(uint delegationId, State newState) external {
        revert("Not implemented");
    }

    function setPurchased(address holder, uint amount) external {
        revert("Not implemented");
    }
} 
