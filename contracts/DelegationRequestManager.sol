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

import "./Permissions.sol";
import "./interfaces/IDelegationPeriodManager.sol";
import "./BokkyPooBahsDateTimeLibrary.sol";

interface IDelegationManager {
    function delegate(uint _requestId) external;
}


contract DelegationRequestManager is Permissions {

    enum DelegationStatus {Pending, Rejected, Proceeded, Expired, Removed}

    uint public delegationRequestId = 1;

    struct DelegationRequest {
        address tokenAddress;
        address validatorAddress;
        uint delegationMonths;
        uint unlockedUntill;
        DelegationStatus status;
    }

    mapping (uint => DelegationRequest) public delegationRequests;
    mapping (address => uint) public delegationRequestsByTokenAddress;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    modifier checkValidatorAccess(uint _requestId) {
        require(_requestId <= delegationRequestId, "Delegation request doesn't exist");
        require(
            msg.sender == delegationRequests[_requestId].validatorAddress,
            "Transaction sender hasn't permissions to change status of request"
        );
        _;
    }

    function createRequest(address _tokenAddress, address _validatorAddress, uint delegationMonths) public {
        IDelegationPeriodManager delegationPeriodManager = IDelegationPeriodManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationPeriodManager")))
        );
        require(msg.sender == _tokenAddress, "Transaction sender is not an actual owner of token");
        // check that the token is unlocked
        require(delegationRequestsByTokenAddress[_tokenAddress] != 0, "This token is already delegated");
        require(
            delegationPeriodManager.isDelegationPeriodAllowed(delegationMonths),
            "Delegation period is not allowed"
        );
        uint expirationRequest = calculateExpirationRequest();
        delegationRequests[delegationRequestId++] = DelegationRequest(
            _tokenAddress,
            _validatorAddress,
            delegationMonths,
            expirationRequest,
            DelegationStatus.Pending
        );
        delegationRequestsByTokenAddress[_tokenAddress] = delegationRequestId;
    }

    function calculateExpirationRequest() public view returns (uint timestamp) {
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

    function getRequestStatus(uint _requestId) public view returns (DelegationStatus) {
        return delegationRequests[_requestId].status;
    }

    function checkExpirationRequest(uint _requestId) public view returns (bool) {
        return delegationRequests[_requestId].unlockedUntill > now ? true : false;
    }

    function getRequestTokenAddress(uint _requestId) public view returns (address) {
        return delegationRequests[_requestId].tokenAddress;
    }

    function approveRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        IDelegationManager delegationManager = IDelegationManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationManager")))
        );
        require(checkExpirationRequest(_requestId), "Validator can't longer accept delegation request");
        delegationRequests[_requestId].status = DelegationStatus.Proceeded;
        delegationManager.delegate(_requestId);
        
    }

    function rejectRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        delegationRequests[_requestId].status = DelegationStatus.Rejected;
    }

    function removePendingRequest(uint _requestId) public {
        require(msg.sender == delegationRequests[_requestId].tokenAddress,"Transaction sender doesn't have permissions to remove request");
        delegationRequests[_requestId].status = DelegationStatus.Removed;
    }

}