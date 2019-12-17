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


contract DelegationController is Permissions {

    struct Delegation {
        address holder; // address of tokens owner
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        uint created; // time of creation
        string info;
    }

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    //       holder  => locked amount
    mapping (address => uint) private _locks;

    ///       holder => delegationId
    mapping (address => uint[]) private _delegationsByHolder;


    //validatorId => sum of tokens multiplied by stake multiplier each holder
    mapping (uint => uint) public effectiveDelegationsTotal;
    //validatorId => sum of tokens each holder
    mapping (uint => uint) public delegationsTotal;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function lock(address holder, uint amount) external allow("SkaleToken") {
        _locks[holder] += amount;
    }

    function unlock(address holder, uint amount) external allow("SkaleToken") {
        _locks[holder] -= amount;
    }

    function getLocked(address holder) external returns (uint) {
        return _locks[holder];
    }

    function delegate(uint delegationId) external allow("DelegationRequestManager") {
        address holder;
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        // (holder, validatorId, amount, , delegationPeriod, ,)
        Delegation memory delegation = getDelegation(delegationId);
        uint stakeEffectiveness = DelegationPeriodManager(
            contractManager.getContract("DelegationPeriodManager")
        ).getStakeMultiplier(delegation.delegationPeriod);

        // revert("delegate is not implemented");


        delegationsTotal[delegation.validatorId] += delegation.amount;
        effectiveDelegationsTotal[delegation.validatorId] += delegation.amount * stakeEffectiveness;


        // TODO: Lock tokens
    }

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        uint created,
        string calldata info
    )
        external
        allow("DelegationRequestManager")
        returns (uint delegationId)
    {
        delegationId = delegations.length;
        delegations.push(Delegation(
            holder,
            validatorId,
            amount,
            delegationPeriod,
            created,
            info
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

    function getDelegation(uint delegationId) public view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

}
