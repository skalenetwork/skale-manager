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
import "./DelegationPeriodManager.sol";
import "../interfaces/delegation/IValidatorDelegation.sol";
import "../interfaces/delegation/IDelegatableToken.sol";
import "../thirdparty/BokkyPooBahsDateTimeLibrary.sol";
import "./ValidatorDelegation.sol";
import "./DelegationController.sol";
import "../SkaleToken.sol";
import "./TokenState.sol";


contract DelegationRequestManager is Permissions {

    struct DelegationRequest {
        address tokenAddress;
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        uint unlockedUntill;
        string description;
    }

    DelegationRequest[] public delegationRequests;
    mapping (address => uint[]) public delegationRequestsByTokenAddress;
    // mapping (address => bool) public delegated;


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    modifier checkValidatorAccess(uint requestId) {
        ValidatorDelegation validatorDelegation = ValidatorDelegation(
            contractManager.getContract("ValidatorDelegation")
        );
        require(requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            validatorDelegation.checkValidatorAddressToId(msg.sender, delegationRequests[requestId].validatorId),
            "Transaction sender hasn't permissions to change status of request"
        );
        _;
    }

    function createRequest(
        address tokenAddress,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external returns(uint requestId)
    {
        IValidatorDelegation validatorDelegation = IValidatorDelegation(
            contractManager.getContract("ValidatorDelegation")
        );
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        // require(!delegated[tokenAddress], "Token is already in the process of delegation");
        require(
            DelegationPeriodManager(
                contractManager.getContract("DelegationPeriodManager")
            ).isDelegationPeriodAllowed(delegationPeriod),
            "This delegation period is not allowed"
        );
        uint holderBalance = SkaleToken(contractManager.getContract("SkaleToken")).balanceOf(tokenAddress);
        uint lockedTokens = tokenState.getLockedCount(tokenAddress);
        require(holderBalance - lockedTokens >= amount, "Delegator hasn't enough tokens to delegate");
        require(validatorDelegation.validatorExists(validatorId), "Validator is not registered");
        uint expirationRequest = calculateExpirationRequest();
        delegationRequests.push(DelegationRequest(
            tokenAddress,
            validatorId,
            amount,
            delegationPeriod,
            expirationRequest,
            info
        ));
        requestId = delegationRequests.length-1;
        delegationRequestsByTokenAddress[tokenAddress].push(requestId);
        tokenState.setState(requestId, TokenState.State.PROPOSED);
    }

    function checkValidityRequest(uint requestId) public view returns (bool) {
        require(delegationRequests[requestId].tokenAddress != address(0), "Token address doesn't exist");
        return delegationRequests[requestId].unlockedUntill > now ? true : false;
    }

    function acceptRequest(uint requestId) public checkValidatorAccess(requestId) {
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        require(
            tokenState.getState(requestId) == TokenState.State.PROPOSED ||
            tokenState.getState(requestId) == TokenState.State.PURCHASED_PROPOSED,
            "Validator cannot accept request for delegation, because it's not proposed"
        );
        tokenState.setState(requestId, TokenState.State.ACCEPTED);

        require(checkValidityRequest(requestId), "Validator can't longer accept delegation request");
        delegationController.delegate(requestId);
    }

    function cancelRequest(uint requestId) external {
        require(requestId < delegationRequests.length, "Delegation request doesn't exist");
        require(
            msg.sender == delegationRequests[requestId].tokenAddress,
            "Only token holder can cancel request"
        );
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        TokenState.State state = tokenState.getState(requestId);
        if (state == TokenState.State.PROPOSED) {
            tokenState.setState(requestId, TokenState.State.UNLOCKED);
        } else if (state == TokenState.State.PURCHASED_PROPOSED) {
            tokenState.setState(requestId, TokenState.State.PURCHASED);
        }
    }

    // function getAllDelegationRequests() public view returns (DelegationRequest[] memory) {
    //     return delegationRequests;
    // }

    function getDelegationRequestsForValidator(uint validatorId) external returns (DelegationRequest[] memory) {

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