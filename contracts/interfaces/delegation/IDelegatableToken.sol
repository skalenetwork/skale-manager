/*
    IDelegatableToken.sol - SKALE Manager
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

interface IDelegatableToken {
    event DelegationRequestIsSent(uint id);

    /// @notice Makes all tokens of target account unavailable to move
    function lock(address target) external;

    /// @notice Makes all tokens of target account available to move
    function unlock(address target) external;

    /// @notice Check that token for target address in locked
    function isLocked(address target) external returns (bool);
}