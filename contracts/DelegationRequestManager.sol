/*
    SkaleToken.sol - SKALE Manager
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

pragma solidity ^0.5.0;

import "./Permissions.sol";
import "./interfaces/IDelegationPeriodManager.sol";

contract DelegationRequestManager is Permissions {

    enum DelegationStatus {Accepted, Rejected, Undefined, Proceed, Expired}

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

    function createDelegationRequest(address _tokenAddress, address _validatorAddress, uint delegationMonths) public {
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
        delegationRequests[delegationRequestId++] = DelegationRequest(
            _tokenAddress,
            _validatorAddress,
            delegationMonths,
            0,
            DelegationStatus.Undefined
        );
        delegationRequestsByTokenAddress[_tokenAddress] = delegationRequestId;
    }

    function getDelegationRequestStatus(uint _requestId) public view returns (DelegationStatus) {
        return delegationRequests[_requestId].status;
    }

    function setDelegationRequestStatus(uint _requestId, DelegationStatus status) public allow("DelegationManager") {
        delegationRequests[_requestId].status = status;
    }
    

    function getDelegationRequestTokenAddress(uint _requestId) public view returns (address) {
        return delegationRequests[_requestId].tokenAddress;
    }

    function approveDelegationRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        delegationRequests[_requestId].status = DelegationStatus.Accepted;
        delegationRequests[_requestId].unlockedUntill = now + 1 weeks;
    }

    function rejectDelegationRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        delegationRequests[_requestId].status = DelegationStatus.Rejected;
    }

}