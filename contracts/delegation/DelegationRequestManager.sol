/*
    DelegationRequestManager.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky
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
import "../interfaces/IDelegationPeriodManager.sol";
import "../BokkyPooBahsDateTimeLibrary.sol";

interface IDelegationManager {
    function delegate(uint _requestId) external;
}


contract DelegationRequestManager is Permissions {

    enum DelegationStatus {Pending, Canceled, Rejected, Proceeded, Expired}


    struct DelegationRequest {
        address tokenAddress;
        address validatorAddress;
        uint delegationMonths;
        uint unlockedUntill;
        DelegationStatus status;
    }

    DelegationRequest[] public delegationRequests;
    mapping (address => uint[]) public delegationRequestsByTokenAddress;
    mapping (address => address) public delegationTokenbyValidator; //become address(0) after expiration of delegation

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    modifier checkValidatorAccess(uint _requestId) {
        require(_requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            msg.sender == delegationRequests[_requestId].validatorAddress,
            "Transaction sender hasn't permissions to change status of request"
        );
        _;
    }

    function createRequest(address _validatorAddress, uint delegationMonths) public {
        IDelegationPeriodManager delegationPeriodManager = IDelegationPeriodManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationPeriodManager")))
        );
        address tokenAddress = msg.sender;
        require(_validatorAddress != address(0), "Validator's address cannot be null");
        require(delegationTokenbyValidator[tokenAddress] != _validatorAddress, "Delegator cannot delegate twice to the same validator");
        // check that the token is unlocked
        uint[] memory requestIds = delegationRequestsByTokenAddress[tokenAddress];
        for (uint i = 0; i < requestIds.length; i++) {
            uint requestId = requestIds[i];
            require(delegationRequests[requestId].status != DelegationStatus.Proceeded, "Token is already in the process of delegation");
        }
        require(
            delegationPeriodManager.isDelegationPeriodAllowed(delegationMonths),
            "Delegation period is not allowed"
        );
        uint expirationRequest = calculateExpirationRequest();
        delegationRequests.push(DelegationRequest(
            tokenAddress,
            _validatorAddress,
            delegationMonths,
            expirationRequest,
            DelegationStatus.Pending
        ));
        delegationRequestsByTokenAddress[tokenAddress].push(delegationRequests.length-1);
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

    function checkExpirationRequest(uint _requestId) public view returns (bool) {
        return delegationRequests[_requestId].unlockedUntill > now ? true : false;
    }

    function approveRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        IDelegationManager delegationManager = IDelegationManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationManager")))
        );
        require(
            delegationRequests[_requestId].status == DelegationStatus.Pending,
            "Validator can't approve request that isn't in Pending status"
        );
        require(checkExpirationRequest(_requestId), "Validator can't longer accept delegation request");
        delegationRequests[_requestId].status = DelegationStatus.Proceeded;
        delegationManager.delegate(_requestId);
        
    }
 
    function rejectRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        delegationRequests[_requestId].status = DelegationStatus.Rejected;
    }


    function cancelRequest(uint _requestId) public {
        require(_requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            msg.sender == delegationRequests[_requestId].tokenAddress,
            "Only token holder can cancel request"
        );
        delegationRequests[_requestId].status = DelegationStatus.Canceled;
    }


    function getAllDelegationRequests() public view returns (DelegationRequest[] memory) {
        return delegationRequests;
    }

    function getDelegationRequestsForValidator(uint validatorId) public returns (DelegationRequest[] memory) {
        
    }

}