// SPDX-License-Identifier: AGPL-3.0-only

/*
    IBountyV2.sol - SKALE Manager Interfaces
    Copyright (C) 2021-Present SKALE Labs
    @author Artem Payvin

    SKALE Manager Interfaces is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager Interfaces is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager Interfaces.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.6.10 <0.9.0;

interface IBountyV2 {

    /**
     * @dev Emitted when bounty reduction is turned on or turned off.
     */
    event BountyReduction(bool status);
    /**
     * @dev Emitted when a node creation window was changed.
     */
    event NodeCreationWindowWasChanged(
        uint oldValue,
        uint newValue
    );

    function calculateBounty(uint nodeIndex) external returns (uint);
    function enableBountyReduction() external;
    function disableBountyReduction() external;
    function setNodeCreationWindowSeconds(uint window) external;
    function handleDelegationAdd(uint amount, uint month) external;
    function handleDelegationRemoving(uint amount, uint month) external;
    function estimateBounty(uint nodeIndex) external view returns (uint);
    function getNextRewardTimestamp(uint nodeIndex) external view returns (uint);
    function getEffectiveDelegatedSum() external view returns (uint[] memory);
}