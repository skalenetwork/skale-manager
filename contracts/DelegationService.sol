/*
    DelegationService.sol - SKALE Manager
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

import "./interfaces/delegation/IHolderDelegation.sol";
import "./interfaces/delegation/IValidatorDelegation.sol";
import "./interfaces/delegation/IManagerDelegation.sol";
import "./interfaces/delegation/ITokenDelegation.sol";


contract DelegationService is IHolderDelegation, IValidatorDelegation, IManagerDelegation, ITokenDelegation {
    function requestUndelegation(address validator, uint amount) external {
        revert("Not implemented");
    }

    /// @notice Allows validator to accept tokens delegated at `requestId`
    function accept(uint requestId) external {
        revert("Not implemented");
    }

    /// @notice Sets persent of bounty taken by validator
    function setFee(uint fee) external {
        revert("Not implemented");
    }

    /// @notice Adds node to SKALE network
    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp) external
    {
        revert("Not implemented");
    }

    /// @notice Register address as validator
    function register(string calldata name, string calldata description) external {
        revert("Not implemented");
    }

    function setMinimumDelegationAmount(uint amount) external {
        revert("Not implemented");
    }

    /// @notice Requests return of tokens that are locked in SkaleManager
    function returnTokens(uint amount) external {
        revert("Not implemented");
    }

    /// @notice Returns array of delegation requests id
    function listDelegationRequests() external returns (uint[] memory) {
        revert("Not implemented");
    }

    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(address validator, uint amount) external {
        revert("Not implemented");
    }

    /// @notice Allows service to pay `amount` of tokens to `validator`
    function pay(address validator, uint amount) external {
        revert("Not implemented");
    }

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(address validator) external returns (uint) {
        revert("Not implemented");
    }

    function setMinimumStakingRequirement(uint amount) external {
        revert("Not implemented");
    }

    /// @notice Checks if tokens of `account` is locked
    function isLocked(address account) external returns (bool) {
        revert("Not implemented");
    }
}