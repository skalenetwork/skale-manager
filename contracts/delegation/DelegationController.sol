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


contract DelegationController is Permissions {

    struct Delegation {
        uint valodatorId;
        address holder;
        uint amount;
        uint stakeEffectiveness;
        bool purchased;
    }

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    ///       holder => delegationId
    mapping (address => uint[]) private _delegationsByHolder;

    // mapping (address => uint) public effectiveDelegationsTotal;
    // mapping (uint => uint) public delegationsTotal;
    // mapping (address => uint) public delegated;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function delegate(uint requestId) external {
        DelegationRequestManager delegationRequestManager = DelegationRequestManager(
            contractManager.getContract("DelegationRequestManager")
        );
        // check that request with such id exists
        // limit acces to call method delegate only for DelegationRequestManager
        address tokenAddress;
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        (tokenAddress, validatorId, amount, delegationPeriod) = delegationRequestManager.getDelegationRequest(requestId);
        // uint stakeEffectiveness = DelegationPeriodManager(
        //     contractManager.getContract("DelegationPeriodManager")
        // ).getStakeMultiplier(delegationPeriod);
        uint endTime = calculateEndTime(delegationPeriod);

        revert("delegate is not implemented");

        // addDelegation(Delegation(validatorId, tokenAddress, amount, stakeEffectiveness, true or false?));

        // TODO: Lock tokens
        // delegationsTotal[validatorId] += amount * stakeEffectiveness;
        // delegated[tokenAddress] += amount;
    }

    function unDelegate(uint validatorId) external view {
        // require(delegations[validatorId].tokenAddress != address(0), "Token with such address wasn't delegated");
        // Call Token.unlock(lockTime)
        // update isDelegated
    }

    function getDelegationsByHolder(address holder) external view returns (uint[] memory) {
        return _delegationsByHolder[holder];
    }

    function getDelegation(uint delegationId) external view returns (Delegation memory) {
        require(delegationId < delegations.length, "Delegation does not exist");
        return delegations[delegationId];
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

    function addDelegation(Delegation memory delegation) internal returns (uint delegationId) {
        delegationId = delegations.length;
        delegations.push(delegation);
        _delegationsByHolder[delegation.holder].push(delegationId);
    }
}
