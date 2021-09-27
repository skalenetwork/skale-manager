// SPDX-License-Identifier: AGPL-3.0-only

/*
    SlashingTable.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Dmytro Stebaiev
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

pragma solidity 0.6.10;

import "./Permissions.sol";
import "./ConstantsHolder.sol";

/**
 * @title Slashing Table
 * @dev This contract manages slashing conditions and penalties.
 */
contract SlashingTable is Permissions {
    mapping (uint => uint) private _penalties;

    bytes32 public constant PENALTY_SETTER_ROLE = keccak256("PENALTY_SETTER_ROLE");

    /**
     * @dev Emitted when penalty was added
     */
    event PenaltyAdded(uint indexed offenseHash, string offense, uint penalty);
    
    /**
     * @dev Allows the Owner to set a slashing penalty in SKL tokens for a
     * given offense.
     */
    function setPenalty(string calldata offense, uint penalty) external {
        require(hasRole(PENALTY_SETTER_ROLE, msg.sender), "PENALTY_SETTER_ROLE is required");
        uint offenseHash = uint(keccak256(abi.encodePacked(offense)));
        _penalties[offenseHash] = penalty;
        emit PenaltyAdded(offenseHash, offense, penalty);
    }

    /**
     * @dev Returns the penalty in SKL tokens for a given offense.
     */
    function getPenalty(string calldata offense) external view returns (uint) {
        uint penalty = _penalties[uint(keccak256(abi.encodePacked(offense)))];
        return penalty;
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
    }
}
