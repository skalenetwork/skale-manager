/*
    IValidatorDelegation.sol - SKALE Manager
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

interface IValidatorDelegation {
    /// @notice Allows validator to accept tokens delegated at `requestId`
    function accept(uint requestId) external;

    /// @notice Sets persent of bounty taken by validator
    function setFee(uint fee) external;

    /// @notice Adds node to SKALE network
    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp) external;

    /// @notice Register address as validator
    function register(string calldata name, string calldata description) external;

    function setMinimumDelegationAmount(uint amount) external;

    /// @notice Requests return of tokens that are locked in SkaleManager
    function returnTokens(uint amount) external;

    /// @notice Returns array of delegation requests id
    function listDelegationRequests() external returns (uint[] memory);
}