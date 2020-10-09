// SPDX-License-Identifier: AGPL-3.0-only

/*
    Bounty.sol - SKALE Manager
    Copyright (C) 2020-Present SKALE Labs
    @author Dmytro Stebaiev

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

pragma solidity 0.6.10;

import "./delegation/PartialDifferences.sol";
import "./delegation/TimeHelpers.sol";

import "./ConstantsHolder.sol";
import "./Nodes.sol";
import "./Permissions.sol";


contract BountyV2 is Permissions {
    using PartialDifferences for PartialDifferences.Value;
    
    uint public constant YEAR1_BOUNTY = 3850e5 * 1e18;
    uint public constant YEAR2_BOUNTY = 3465e5 * 1e18;
    uint public constant YEAR3_BOUNTY = 3080e5 * 1e18;
    uint public constant YEAR4_BOUNTY = 2695e5 * 1e18;
    uint public constant YEAR5_BOUNTY = 2310e5 * 1e18;
    uint public constant YEAR6_BOUNTY = 1925e5 * 1e18;
    uint public constant EPOCHS_PER_YEAR = 12;
    uint public constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint public constant BOUNTY_WINDOW_DAYS = 5;
    
    uint private _nextEpoch;
    uint private _epochPool;
    bool public bountyReduction;

    PartialDifferences.Value private _effectiveDelegatedSum;

    function calculateBounty(uint nodeIndex)
        external
        allow("SkaleManager")
        returns (uint)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

        uint lastRewardTimestamp = nodes.getNodeLastRewardDate(nodeIndex);
        uint currentMonth = timeHelpers.getCurrentMonth();
        require(
            timeHelpers.timestampToMonth(lastRewardTimestamp) < currentMonth,
            "Bounty for this month has been already received"
        );
        require(
            timeHelpers.addMonths(lastRewardTimestamp, 1) <= now ||
            timeHelpers.monthToTimestamp(currentMonth.add(1)).sub(BOUNTY_WINDOW_DAYS.mul(SECONDS_PER_DAY)) <= now,
            "Transaction is sent too early"
        );

        _refillEpochPool(currentMonth, timeHelpers, constantsHolder);

        uint bounty = _calculateMaximumBountyAmount(_epochPool, _nextEpoch, nodeIndex, constantsHolder, nodes);

        bounty = _reduceBounty(
            bounty,
            nodeIndex,
            nodes,
            constantsHolder
        );

        _epochPool = _epochPool.sub(bounty);

        return bounty;
    }

    function enableBountyReduction() external onlyOwner {
        bountyReduction = true;
    }

    function disableBountyReduction() external onlyOwner {
        bountyReduction = false;
    }

    function handleDelegationAdd(uint /*amount*/, uint /*month*/) external allow("DelegationController") {
        revert("Not implemented");
    }

    function handleDelegationRemoving(uint /*amount*/, uint /*month*/) external allow("DelegationController") {
        revert("Not implemented");
    }

    function handleNodeCreation(uint /*validatorId*/) external allow("Nodes") {
        revert("Not implemented");
    }

    function handleNodeRemoving(uint /*validatorId*/) external allow("Nodes") {
        revert("Not implemented");
    }

    function estimateBounty(uint nodeIndex) external view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

        uint stagePoolSize;
        uint nextStage;
        (stagePoolSize, nextStage) = _getEpochPool(timeHelpers.getCurrentMonth(), timeHelpers, constantsHolder);

        return _calculateMaximumBountyAmount(
            stagePoolSize,
            nextStage,
            nodeIndex,
            constantsHolder,
            nodes
        );
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
        _nextEpoch = 0;
        _epochPool = 0;
        bountyReduction = false;
    }

    // private

    function _calculateMaximumBountyAmount(
        uint /* epochPoolSize */,
        uint /* nextEpoch */,
        uint nodeIndex,
        ConstantsHolder constantsHolder,
        Nodes nodes
    )
        private
        view
        returns (uint)
    {
        if (nodes.isNodeLeft(nodeIndex)) {
            return 0;
        }

        if (now < constantsHolder.launchTimestamp()) {
            // network is not launched
            // bounty is turned off
            return 0;
        }

        revert("Not implemented");
    }

    function _getFirstEpoch(TimeHelpers timeHelpers, ConstantsHolder constantsHolder) private view returns (uint) {
        return timeHelpers.timestampToMonth(constantsHolder.launchTimestamp());
    }

    function _getEpochPool(
        uint currentMonth,
        TimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
        view
        returns (uint epochPool, uint nextEpoch)
    {
        epochPool = _epochPool;
        for (nextEpoch = _nextEpoch; nextEpoch <= currentMonth; ++nextEpoch) {
            epochPool = epochPool.add(_getEpochReward(nextEpoch, timeHelpers, constantsHolder));
        }
    }

    function _refillEpochPool(uint currentMonth, TimeHelpers timeHelpers, ConstantsHolder constantsHolder) private {
        (_epochPool, _nextEpoch) = _getEpochPool(currentMonth, timeHelpers, constantsHolder);
    }

    function _getEpochReward(
        uint epoch,
        TimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
        view
        returns (uint)
    {
        uint epochIndex = epoch.sub(_getFirstEpoch(timeHelpers, constantsHolder));
        uint year = epochIndex.div(EPOCHS_PER_YEAR);
        if (year >= 6) {
            uint power = year.sub(6).div(3).add(1);
            if (power < 256) {
                return YEAR6_BOUNTY.div(2 ** power);
            } else {
                return 0;
            }
        } else {
            uint[6] memory customBounties = [
                YEAR1_BOUNTY,
                YEAR2_BOUNTY,
                YEAR3_BOUNTY,
                YEAR4_BOUNTY,
                YEAR5_BOUNTY,
                YEAR6_BOUNTY
            ];
            return customBounties[year].div(EPOCHS_PER_YEAR);
        }
    }

    function _reduceBounty(
        uint bounty,
        uint nodeIndex,
        Nodes nodes,
        ConstantsHolder constants
    )
        private
        returns (uint reducedBounty)
    {
        if (!bountyReduction) {
            return bounty;
        }

        reducedBounty = bounty;

        if (!nodes.checkPossibilityToMaintainNode(nodes.getValidatorId(nodeIndex), nodeIndex)) {
            reducedBounty = reducedBounty.div(constants.MSR_REDUCING_COEFFICIENT());
        }
    }
}