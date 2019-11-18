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
import "../interfaces/delegation/internal/IManagerDelegationInternal.sol";
import "../interfaces/IDelegationPeriodManager.sol";
import "../BokkyPooBahsDateTimeLibrary.sol";


contract DelegationService is Permissions, IHolderDelegation, IValidatorDelegation, IManagerDelegationInternal {

    enum DelegationStatus {Pending, Canceled, Rejected, Proceeded, Expired}


    struct DelegationRequest {
        address tokenAddress;
        uint validatorId;
        uint delegationPeriod;
        uint unlockedUntill;
        DelegationStatus status;
    }

    DelegationRequest[] public delegationRequests;
    mapping (address => uint[]) public delegationRequestsByTokenAddress;
    mapping (address => uint) public delegationTokenbyValidator; //become address(0) after expiration of delegation

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    modifier checkValidatorAccess(uint _requestId) {
        IValidatorDelegation validatorDelegation = IValidatorDelegation(
            contractManager.contracts(keccak256(abi.encodePacked("ValidatorDelegation")))
        );
        require(_requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            // TODO
            validatorDelegation.checkValidatorAddressToId(msg.sender, delegationRequests[_requestId].validatorId),
            "Transaction sender hasn't permissions to change status of request"
        );
        _;
    }

    function requestUndelegation() external {
        revert("Not implemented");
    }

    /// @notice Allows validator to accept tokens delegated at `requestId`
    function accept(uint requestId) external {
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
        external returns(uint requestId)
    {
        IDelegationPeriodManager delegationPeriodManager = IDelegationPeriodManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationPeriodManager")))
        );
        address tokenAddress = msg.sender;
        require(delegationTokenbyValidator[tokenAddress] != validatorId, "Delegator cannot delegate twice to the same validator");
        // check that the token is unlocked
        uint[] memory requestIDs = delegationRequestsByTokenAddress[tokenAddress];
        for (uint i = 0; i < requestIDs.length; i++) {
            uint requestID = requestIDs[i];
            require(delegationRequests[requestID].status != DelegationStatus.Proceeded, "Token is already in the process of delegation");
        }
        require(
            delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod),
            "Delegation period is not allowed"
        );
        uint expirationRequest = calculateExpirationRequest();
        delegationRequests.push(DelegationRequest(
            tokenAddress,
            validatorId,
            delegationPeriod,
            expirationRequest,
            DelegationStatus.Pending
        ));
        requestId = delegationRequests.length-1;
        delegationRequestsByTokenAddress[tokenAddress].push(requestId);
    }

    function cancelPendingDelegation(uint requestId) external {
        revert("Not implemented");
    }

    function getAllDelegationRequests() external returns(uint[] memory) {
        revert("Not implemented");
    }

    function getDelegationRequestsForValidator(uint validatorId) external returns (uint[] memory) {
        revert("Not implemented");
    }

    /// @notice Register new as validator
    function registerValidator(string calldata name, string calldata description, uint feeRate) external returns (uint validatorId) {
        // revert("Not implemented");
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

    function calculateExpirationRequest() private view returns (uint timestamp) {
        uint year;
        uint month;
        uint nextYear;
        uint nextMonth;
        (year, month, ) = BokkyPooBahsDateTimeLibrary.timestampToDate(now);
        if (month != 12) {
            nextMonth = month + 1;
            nextYear = year;
        } else {
            nextMonth = 1;
            nextYear = year + 1;
        }
        timestamp = BokkyPooBahsDateTimeLibrary.timestampFromDate(nextYear, nextMonth, 1);
    }
}