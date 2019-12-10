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
        address holder; // address of tokens owner
        uint validatorId;
        uint amount;
        uint created; // time of creation
        uint delegationPeriod;
        string info;
        bool purchased; // are these tokens purchased on token sale
    }

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    ///       holder => delegationId
    mapping (address => uint[]) private _delegationsByHolder;

    // mapping (address => uint) public effectiveDelegationsTotal;
    // mapping (uint => uint) public delegationsTotal;
    // mapping (address => uint) public delegated;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function delegate(uint delegationId) external {
        // DelegationRequestManager delegationRequestManager = DelegationRequestManager(
        //     contractManager.getContract("DelegationRequestManager")
        // );
        // check that request with such id exists
        // limit acces to call method delegate only for DelegationRequestManager
        // address holder;
        // uint validatorId;
        // uint amount;
        // uint delegationPeriod;
        // (holder, validatorId, amount, delegationPeriod) = getDelegation(delegationId);
        // uint stakeEffectiveness = DelegationPeriodManager(
        //     contractManager.getContract("DelegationPeriodManager")
        // ).getStakeMultiplier(delegationPeriod);
        // uint endTime = calculateEndTime(delegationPeriod);

        // revert("delegate is not implemented");


        // TODO: Lock tokens
        // delegationsTotal[validatorId] += amount * stakeEffectiveness;
        // delegated[holder] += amount;
    }

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint created,
        uint delegationPeriod,
        string calldata info
    )
        external allow("DelegationRequestManager") returns (uint delegationId)
    {
        delegationId = delegations.length;
        delegations.push(Delegation(
            holder,
            validatorId,
            amount,
            created,
            delegationPeriod,
            info,
            false
        ));
        _delegationsByHolder[holder].push(delegationId);
    }

    function unDelegate(uint validatorId) external view {
        // require(delegations[validatorId].holder != address(0), "Token with such address wasn't delegated");
        // Call Token.unlock(lockTime)
        // update isDelegated
    }

    function getDelegationsByHolder(address holder) external view returns (uint[] memory) {
        return _delegationsByHolder[holder];
    }

    function getDelegation(uint delegationId) external view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

    function setPurchased(uint delegationId, bool value) external checkDelegationExists(delegationId) allow("TokenState") {
        delegations[delegationId].purchased = value;
    }

    function calculateEndTime(uint months) external view returns (uint endTime) {
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
