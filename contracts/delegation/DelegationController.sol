/*
    DelegationController.sol - SKALE Manager
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
import "./DelegationRequestManager.sol";
import "./DelegationPeriodManager.sol";
import "../thirdparty/BokkyPooBahsDateTimeLibrary.sol";

interface IDelegationRequestManager {
    function delegationRequests(uint requestId) external returns (DelegationRequestManager.DelegationRequest memory);
}


contract DelegationController is Permissions {

    struct Delegation {
        uint amount;
        uint stakeEffectiveness;
        uint expirationDate;
    }

    //      validatorId       tokenAddress
    mapping (uint => mapping (address => Delegation[])) public delegations;
    mapping (address => uint) public effectiveDelegationsTotal;
    mapping (address => uint) public delegationsTotal;
    mapping (address => uint) public delegated;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function delegate(uint requestId) public {
        IDelegationRequestManager delegationRequestManager = IDelegationRequestManager(
            contractManager.getContract("DelegationRequestManager")
        );
        // check that request with such id exists
        // limit acces to call method delegate only for DelegationRequestManager
        DelegationRequestManager.DelegationRequest memory delegationRequest = delegationRequestManager.delegationRequests(requestId);
        uint delegationPeriod = delegationRequest.delegationPeriod;
        address tokenAddress = delegationRequest.tokenAddress;
        uint validatorId = delegationRequest.validatorId;
        uint amount = delegationRequest.amount;
        uint endTime = calculateEndTime(delegationPeriod);
        uint stakeEffectiveness = DelegationPeriodManager(
            contractManager.getContract("DelegationPeriodManager")
        ).getStakeMultiplier(delegationPeriod);

        //Call Token.lock(lockTime)
        delegations[validatorId][tokenAddress].push(
            Delegation(amount, stakeEffectiveness, endTime)
        );
        // delegationTotal[validatorAddress] =+ token.value * DelegationPeriodManager.getStakeMultipler(monthCount);
        delegated[tokenAddress] += amount;
    }

    function unDelegate(uint validatorId) external view {
        // require(delegations[validatorId].tokenAddress != address(0), "Token with such address wasn't delegated");
        // Call Token.unlock(lockTime)
        // update isDelegated
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


}