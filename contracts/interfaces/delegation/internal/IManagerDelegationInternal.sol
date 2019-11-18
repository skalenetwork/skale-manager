/*
    IManagerDelegation.sol - SKALE Manager
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

interface IManagerDelegationInternal {
    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(address validator, uint amount) external;

    /// @notice Allows service to pay `amount` of tokens to `validator`
    function pay(address validator, uint amount) external;

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(address validator) external returns (uint);

    function setMinimumStakingRequirement(uint amount) external;
}