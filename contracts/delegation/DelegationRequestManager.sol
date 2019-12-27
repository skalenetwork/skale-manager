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
import "./ValidatorService.sol";
import "../interfaces/delegation/IDelegatableToken.sol";
import "../thirdparty/BokkyPooBahsDateTimeLibrary.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";
import "../SkaleToken.sol";
import "./TokenState.sol";


contract DelegationRequestManager is Permissions {


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function createRequest(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
        allow("DelegationService")
        returns (uint delegationId)
    {
        ValidatorService validatorService = ValidatorService(
            contractManager.getContract("ValidatorService")
        );
        TokenState tokenState = TokenState(
            contractManager.getContract("TokenState")
        );
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        require(validatorService.checkValidatorExists(validatorId), "Validator is not registered");
        require(
            validatorService.checkMinimumDelegation(validatorId, amount),
            "Amount doesn't meet minimum delegation amount"
        );
        require(
            DelegationPeriodManager(
                contractManager.getContract("DelegationPeriodManager")
            ).isDelegationPeriodAllowed(delegationPeriod),
            "This delegation period is not allowed"
        );
        uint holderBalance = SkaleToken(contractManager.getContract("SkaleToken")).balanceOf(holder);
        uint lockedToDelegate = tokenState.getLockedCount(holder) - tokenState.getPurchasedAmount(holder);
        require(holderBalance - lockedToDelegate >= amount, "Delegator hasn't enough tokens to delegate");
        delegationId = delegationController.addDelegation(
            holder,
            validatorId,
            amount,
            delegationPeriod,
            now,
            info
        );
    }

    function cancelRequest(uint delegationId, address validatorAddress) external {
        TokenState tokenState = TokenState(
            contractManager.getContract("TokenState")
        );
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        ValidatorService validatorService = ValidatorService(
            contractManager.getContract("ValidatorService")
        );
        DelegationController.Delegation memory delegation = delegationController.getDelegation(delegationId);
        require(validatorService.getValidatorId(validatorAddress) == delegation.validatorId,"No permissions to cancel request");
        require(
            tokenState.cancel(delegationId) == TokenState.State.COMPLETED,
            "After cancellation token should be COMPLETED");
    }

    function acceptRequest(uint delegationId) external {
        TokenState tokenState = TokenState(
            contractManager.getContract("TokenState")
        );
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        ValidatorService validatorService = ValidatorService(
            contractManager.getContract("ValidatorService")
        );
        DelegationController.Delegation memory delegation = delegationController.getDelegation(delegationId);
        require(
            validatorService.checkValidatorAddressToId(msg.sender, delegation.validatorId),
            "No permissions to accept request"
        );
        delegationController.delegate(delegationId);
        tokenState.accept(delegationId);
    }

}