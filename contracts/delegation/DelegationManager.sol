/*
    DelegationManager.sol - SKALE Manager
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
import "../interfaces/IDelegationRequestManager.sol";
import "../interfaces/IDelegationPeriodManager.sol";
import "../BokkyPooBahsDateTimeLibrary.sol";


contract DelegationManager is Permissions {

    struct Delegation {
        address tokenAddress;
        uint stakeEffectiveness;
        uint expirationDate;
    }

    mapping (uint => Delegation) public delegations;
    mapping (address => uint) public effectiveDelegationsTotal;
    mapping (address => uint) public delegationsTotal;
    mapping (address => bool) public isDelegated;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function delegate(uint _requestId) public {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationRequestManager")))
        );
        IDelegationPeriodManager delegationPeriodManager = IDelegationPeriodManager(
            contractManager.contracts(keccak256(abi.encodePacked("DelegationPeriodManager")))
        );
        IDelegationRequestManager.DelegationRequest memory delegationRequest = delegationRequestManager.delegationRequests(_requestId);
        // require(address(0) != delegationRequest.tokenAddress, "Request with such id doesn't exist");
        // require(msg.sender == delegationRequestManager, "Message sender hasn't permissions to invoke delegation");
        uint endTime = calculateEndTime(delegationRequest.delegationMonths);
        uint stakeEffectiveness = delegationPeriodManager.getStakeMultiplier(delegationRequest.delegationMonths);
        //Check that validatorAddress is a registered validator

        //Call Token.lock(lockTime)
        delegations[delegationRequest.validatorId] = Delegation(delegationRequest.tokenAddress, stakeEffectiveness, endTime);
        // delegationTotal[validatorAddress] =+ token.value * DelegationPeriodManager.getStakeMultipler(monthCount);
        isDelegated[delegationRequest.tokenAddress] = true;
    }

    function calculateEndTime(uint months) public view returns (uint endTime) {
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
        uint timestamp = BokkyPooBahsDateTimeLibrary.timestampFromDate(nextYear, nextMonth, 1);
        endTime = BokkyPooBahsDateTimeLibrary.addMonths(timestamp, months);
    }

    function unDelegate(uint validatorId) public view {
        require(delegations[validatorId].tokenAddress != address(0), "Token with such address wasn't delegated");
        // Call Token.unlock(lockTime)
        // update isDelegated
    }
}