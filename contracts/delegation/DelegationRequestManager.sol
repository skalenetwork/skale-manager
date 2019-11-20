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
import "../interfaces/delegation/IValidatorDelegation.sol";
import "../BokkyPooBahsDateTimeLibrary.sol";
import "../interfaces/IDelegationRequestManager.sol";


interface IDelegationManager {
    function delegate(uint _requestId) external;
}


contract DelegationRequestManager is Permissions, IDelegationRequestManager {

    DelegationRequest[] public delegationRequests;
    mapping (address => uint[]) public delegationRequestsByTokenAddress;
    mapping (address => bool) public delegated;


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    modifier checkValidatorAccess(uint _requestId) {
        IValidatorDelegation validatorDelegation = IValidatorDelegation(
            contractManager.contracts(keccak256(abi.encodePacked("ValidatorDelegation")))
        );
        require(_requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            validatorDelegation.checkValidatorAddressToId(msg.sender, delegationRequests[_requestId].validatorId),
            "Transaction sender hasn't permissions to change status of request"
        );
        _;
    }

    function createRequest(
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
        require(delegated[tokenAddress], "Token is already in the process of delegation");
        // check that the token is unlocked
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
            info
        ));
        requestId = delegationRequests.length-1;
        delegationRequestsByTokenAddress[tokenAddress].push(requestId);
    }

    function checkValidityRequest(uint _requestId) public view returns (bool) {
        require(delegationRequests[_requestId].tokenAddress != address(0), "Token address doesn't exist");
        return delegationRequests[_requestId].unlockedUntill > now ? true : false;
    }

    function acceptRequest(uint _requestId) public checkValidatorAccess(_requestId) {
        IDelegationManager delegationManager = IDelegationManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationManager")))
        );
        delegated[delegationRequests[_requestId].tokenAddress] = true;
        require(checkValidityRequest(_requestId), "Validator can't longer accept delegation request");
        delegationManager.delegate(_requestId);
    }

    function cancelRequest(uint _requestId) public {
        require(_requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            msg.sender == delegationRequests[_requestId].tokenAddress,
            "Only token holder can cancel request"
        );
        delete delegationRequests[_requestId];
    }

    // function getAllDelegationRequests() public view returns (DelegationRequest[] memory) {
    //     return delegationRequests;
    // }

    function getDelegationRequestsForValidator(uint validatorId) public returns (DelegationRequest[] memory) {
        
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