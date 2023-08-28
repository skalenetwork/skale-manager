// SPDX-License-Identifier: AGPL-3.0-only

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

pragma solidity 0.8.17;

import { ITokenState } from "@skalenetwork/skale-manager-interfaces/delegation/ITokenState.sol";
import { ILocker } from "@skalenetwork/skale-manager-interfaces/delegation/ILocker.sol";
import { IDelegationController } from "@skalenetwork/skale-manager-interfaces/delegation/IDelegationController.sol";

import { Permissions } from "../Permissions.sol";


/**
 * @title Token State
 * @dev This contract manages lockers to control token transferability.
 *
 * The SKALE Network has three types of locked tokens:
 *
 * - Tokens that are transferrable but are currently locked into delegation with
 * a validator.
 *
 * - Tokens that are not transferable from one address to another, but may be
 * delegated to a validator `getAndUpdateLockedAmount`. This lock enforces
 * Proof-of-Use requirements.
 *
 * - Tokens that are neither transferable nor delegatable
 * `getAndUpdateForbiddenForDelegationAmount`. This lock enforces slashing.
 */
contract TokenState is Permissions, ILocker, ITokenState {

    string[] private _lockers;

    IDelegationController private _delegationController;

    bytes32 public constant LOCKER_MANAGER_ROLE = keccak256("LOCKER_MANAGER_ROLE");

    modifier onlyLockerManager() {
        require(hasRole(LOCKER_MANAGER_ROLE, msg.sender), "LOCKER_MANAGER_ROLE is required");
        _;
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
        _setupRole(LOCKER_MANAGER_ROLE, msg.sender);
        addLocker("DelegationController");
        addLocker("Punisher");
    }

    /**
     *  @dev See {ILocker-getAndUpdateLockedAmount}.
     */
    function getAndUpdateLockedAmount(address holder) external override returns (uint256 amount) {
        if (address(_delegationController) == address(0)) {
            _delegationController =
                IDelegationController(contractManager.getContract("DelegationController"));
        }
        uint256 locked = 0;
        if (_delegationController.getDelegationsByHolderLength(holder) > 0) {
            // the holder ever delegated
            for (uint256 i = 0; i < _lockers.length; ++i) {
                ILocker locker = ILocker(contractManager.getContract(_lockers[i]));
                locked = locked + locker.getAndUpdateLockedAmount(holder);
            }
        }
        return locked;
    }

    /**
     * @dev See {ILocker-getAndUpdateForbiddenForDelegationAmount}.
     */
    function getAndUpdateForbiddenForDelegationAmount(address holder) external override returns (uint256 amount) {
        uint256 forbidden = 0;
        for (uint256 i = 0; i < _lockers.length; ++i) {
            ILocker locker = ILocker(contractManager.getContract(_lockers[i]));
            forbidden = forbidden + locker.getAndUpdateForbiddenForDelegationAmount(holder);
        }
        return forbidden;
    }

    /**
     * @dev Allows the Owner to remove a contract from the locker.
     *
     * Emits a {LockerWasRemoved} event.
     */
    function removeLocker(string calldata locker) external override onlyLockerManager {
        uint256 index;
        bytes32 hash = keccak256(abi.encodePacked(locker));
        for (index = 0; index < _lockers.length; ++index) {
            if (keccak256(abi.encodePacked(_lockers[index])) == hash) {
                break;
            }
        }
        if (index < _lockers.length) {
            if (index < _lockers.length - 1) {
                _lockers[index] = _lockers[_lockers.length - 1];
            }
            delete _lockers[_lockers.length - 1];
            _lockers.pop();
            emit LockerWasRemoved(locker);
        }
    }

    /**
     * @dev Allows the Owner to add a contract to the Locker.
     *
     * Emits a {LockerWasAdded} event.
     */
    function addLocker(string memory locker) public override onlyLockerManager {
        _lockers.push(locker);
        emit LockerWasAdded(locker);
    }
}
