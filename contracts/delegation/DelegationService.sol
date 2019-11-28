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
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "../interfaces/delegation/IHolderDelegation.sol";
import "../interfaces/delegation/IValidatorDelegation.sol";
import "../interfaces/IDelegationPeriodManager.sol";
import "../interfaces/IDelegationRequestManager.sol";
import "./ValidatorDelegation.sol";
import "./DelegationManager.sol";


contract DelegationService is Permissions, IHolderDelegation, IValidatorDelegation {
    mapping (address => bool) private _locked;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function requestUndelegation() external {
        revert("Not implemented");
    }

    /// @notice Allows validator to accept tokens delegated at `requestId`
    function accept(uint requestId) external {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationRequestManager")))
        );
        delegationRequestManager.acceptRequest(requestId);
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

    /// @notice Creates request to delegate `amount` of tokens to `validator` from the begining of the next month
    function delegate(
        uint validatorId,
        uint delegationPeriod,
        string calldata info
    )
        external
    {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationRequestManager")))
        );
        uint requestId = delegationRequestManager.createRequest(validatorId, delegationPeriod, info);
        emit DelegationRequestIsSent(requestId);
    }

    function cancelPendingDelegation(uint requestId) external {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationRequestManager")))
        );
        delegationRequestManager.cancelRequest(requestId);
    }

    function getAllDelegationRequests() external returns(uint[] memory) {
        revert("Not implemented");
    }

    function getDelegationRequestsForValidator(uint validatorId) external returns (uint[] memory) {
        revert("Not implemented");
    }

    /// @notice Register new as validator
    function registerValidator(string calldata name, string calldata description, uint feeRate) external returns (uint validatorId) {
        ValidatorDelegation validatorDelegation = ValidatorDelegation(contractManager.getContract("ValidatorDelegation"));
        validatorId = validatorDelegation.registerValidator(name, description, feeRate);
    }

    function unregisterValidator(uint validatorId) external {
        revert("Not implemented");
    }

    /// @notice return how many of validator funds are locked in SkaleManager
    function getBondAmount(uint validatorId) external returns (uint amount) {
        revert("Not implemented");
    }

    function setValidatorName(string calldata newName) external {
        revert("Not implemented");
    }

    function setValidatorDescription(string calldata descripton) external {
        revert("Not implemented");
    }

    function setValidatorAddress(address newAddress) external {
        revert("Not implemented");
    }

    function getValidatorInfo(uint validatorId) external returns (Validator memory validator) {
        revert("Not implemented");
    }

    function getValidators() external returns (uint[] memory validatorIds) {
        revert("Not implemented");
    }

    function withdrawBounty(address bountyCollectionAddress, uint amount) external {
        revert("Not implemented");
    }

    function getEarnedBountyAmount() external returns (uint) {
        revert("Not implemented");
    }

    /// @notice removes node from system
    function deleteNode(uint nodeIndex) external {
        revert("Not implemented");
    }

    /// @notice Makes all tokens of target account unavailable to move
    function lock(address wallet, uint amount) external {
        revert("Lock is not implemented");
    }

    /// @notice Makes all tokens of target account available to move
    function unlock(address target) external {
        revert("Not implemented");
    }

    function getLockedOf(address wallet) external returns (bool) {
        revert("getLockedOf is not implemented");
        // return isDelegated(wallet) || _locked[wallet];
    }

    function getDelegatedOf(address wallet) public returns (bool) {
        revert("isDelegatedOf is not implemented");
        // return DelegationManager(contractManager.getContract("DelegationManager")).isDelegated(wallet);
    }
}
