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

import "@nomiclabs/buidler/console.sol";

import "./delegation/DelegationController.sol";
import "./delegation/PartialDifferences.sol";
import "./delegation/TimeHelpers.sol";

import "./ConstantsHolder.sol";
import "./Nodes.sol";
import "./Permissions.sol";


contract BountyV2 is Permissions {
    using PartialDifferences for PartialDifferences.Value;
    using PartialDifferences for PartialDifferences.Sequence;
    
    uint public constant YEAR1_BOUNTY = 3850e5 * 1e18;
    uint public constant YEAR2_BOUNTY = 3465e5 * 1e18;
    uint public constant YEAR3_BOUNTY = 3080e5 * 1e18;
    uint public constant YEAR4_BOUNTY = 2695e5 * 1e18;
    uint public constant YEAR5_BOUNTY = 2310e5 * 1e18;
    uint public constant YEAR6_BOUNTY = 1925e5 * 1e18;
    uint public constant EPOCHS_PER_YEAR = 12;
    uint public constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint public constant BOUNTY_WINDOW_SECONDS = 3 * SECONDS_PER_DAY;
    uint public constant NODE_CREATION_WINDOW_SECONDS = 3 * SECONDS_PER_DAY;
    
    uint private _nextEpoch;
    uint private _epochPool;
    uint private _bountyWasPaidInCurrentEpoch;
    bool public bountyReduction;

    PartialDifferences.Value private _effectiveDelegatedSum;
    // validatorId   amount of nodes
    mapping (uint => uint) public nodesByValidator;
    // validatorId => sequence
    mapping (uint => PartialDifferences.Value) private _effectiveDelegatedToValidator;

    function calculateBounty(uint nodeIndex)
        external
        allow("SkaleManager")
        returns (uint)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        
        require(
            _getNextRewardTimestamp(nodeIndex, nodes, timeHelpers) <= now,
            "Transaction is sent too early"
        );

        uint currentMonth = timeHelpers.getCurrentMonth();
        _refillEpochPool(currentMonth, timeHelpers, constantsHolder);

        uint bounty = _calculateMaximumBountyAmount(_epochPool, currentMonth, nodeIndex, constantsHolder, nodes);

        bounty = _reduceBounty(
            bounty,
            nodeIndex,
            nodes,
            constantsHolder
        );

        _epochPool = _epochPool.sub(bounty);
        _bountyWasPaidInCurrentEpoch = _bountyWasPaidInCurrentEpoch.add(bounty);

        return bounty;
    }

    function enableBountyReduction() external onlyOwner {
        bountyReduction = true;
    }

    function disableBountyReduction() external onlyOwner {
        bountyReduction = false;
    }

    function handleDelegationAdd(
        uint validatorId,
        uint amount,
        uint month
    )
        external
        allowTwo("DelegationController", "ValidatorService")
    {
        if (nodesByValidator[validatorId] > 0) {
            _effectiveDelegatedSum.addToValue(amount.mul(nodesByValidator[validatorId]), month);
        }
        _effectiveDelegatedToValidator[validatorId].addToValue(amount, month);
    }

    function handleDelegationRemoving(
        uint validatorId,
        uint amount,
        uint month
    )
        external
        allowTwo("DelegationController", "ValidatorService")
    {
        if (nodesByValidator[validatorId] > 0) {
            _effectiveDelegatedSum.subtractFromValue(amount.mul(nodesByValidator[validatorId]), month);
        }
        _effectiveDelegatedToValidator[validatorId].subtractFromValue(amount, month);
    }

    function handleNodeCreation(uint validatorId) external allow("Nodes") {
        nodesByValidator[validatorId] = nodesByValidator[validatorId].add(1);

        _changeEffectiveDelegatedSum(validatorId, true);
    }

    function handleNodeRemoving(uint validatorId) external allow("Nodes") {
        require(nodesByValidator[validatorId] > 0, "All nodes have been already removed");
        nodesByValidator[validatorId] = nodesByValidator[validatorId].sub(1);
        
        _changeEffectiveDelegatedSum(validatorId, false);
    }

    function estimateBounty(uint /* nodeIndex */) external pure returns (uint) {
        revert("Not implemented");
        // ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        // Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        // TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

        // uint stagePoolSize;
        // uint nextStage;
        // (stagePoolSize, nextStage) = _getEpochPool(timeHelpers.getCurrentMonth(), timeHelpers, constantsHolder);

        // return _calculateMaximumBountyAmount(
        //     stagePoolSize,
        //     nextStage.sub(1),
        //     nodeIndex,
        //     constantsHolder,
        //     nodes
        // );
    }

    function getNextRewardTimestamp(uint nodeIndex) external view returns (uint) {
        return _getNextRewardTimestamp(
            nodeIndex,
            Nodes(contractManager.getContract("Nodes")),
            TimeHelpers(contractManager.getContract("TimeHelpers"))
        );
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
        _nextEpoch = 0;
        _epochPool = 0;
        _bountyWasPaidInCurrentEpoch = 0;
        bountyReduction = false;
    }

    // private

    function _calculateMaximumBountyAmount(
        uint epochPoolSize,
        uint currentMonth,
        uint nodeIndex,
        ConstantsHolder constantsHolder,
        Nodes nodes
    )
        private
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

        DelegationController delegationController = 
            DelegationController(contractManager.getContract("DelegationController"));

        return epochPoolSize
            .add(_bountyWasPaidInCurrentEpoch)
            .mul(delegationController.getAndUpdateEffectiveDelegatedToValidator(
                nodes.getValidatorId(nodeIndex), currentMonth)
            )
            .div(_effectiveDelegatedSum.getAndUpdateValue(currentMonth));
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
        uint epochPool;
        uint nextEpoch;
        (epochPool, nextEpoch) = _getEpochPool(currentMonth, timeHelpers, constantsHolder);
        if (_nextEpoch < nextEpoch) {
            (_epochPool, _nextEpoch) = (epochPool, nextEpoch);
            _bountyWasPaidInCurrentEpoch = 0;
        }
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
        uint firstEpoch = _getFirstEpoch(timeHelpers, constantsHolder);
        if (epoch < firstEpoch) {
            return 0;
        }
        uint epochIndex = epoch.sub(firstEpoch);
        uint year = epochIndex.div(EPOCHS_PER_YEAR);
        if (year >= 6) {
            uint power = year.sub(6).div(3).add(1);
            if (power < 256) {
                return YEAR6_BOUNTY.div(2 ** power).div(EPOCHS_PER_YEAR);
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

    function _changeEffectiveDelegatedSum(uint validatorId, bool add) private {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint currentMonth = timeHelpers.getCurrentMonth();
        
        uint effectiveDelegated = _effectiveDelegatedToValidator[validatorId].getAndUpdateValue(currentMonth);
        uint addedToStatistic = 0;
        if (now < timeHelpers.monthToTimestamp(currentMonth).add(NODE_CREATION_WINDOW_SECONDS)) {
            if (add) {
                _effectiveDelegatedSum.addToValue(effectiveDelegated, currentMonth);
            } else {
                _effectiveDelegatedSum.subtractFromValue(effectiveDelegated, currentMonth);
            }
            addedToStatistic = effectiveDelegated;
        }
        for (
            uint month = currentMonth.add(1);
            month == currentMonth.add(1) || month <= _effectiveDelegatedToValidator[validatorId].lastChangedMonth;
            ++month
        )
        {
            effectiveDelegated = effectiveDelegated
                .add(_effectiveDelegatedToValidator[validatorId].addDiff[month])
                .sub(_effectiveDelegatedToValidator[validatorId].subtractDiff[month]);
            if (effectiveDelegated != addedToStatistic) {
                _addToEffectiveDelegatedSum(month, effectiveDelegated, addedToStatistic, add);
                addedToStatistic = effectiveDelegated;
            }
        }
    }

    function _addToEffectiveDelegatedSum(uint month, uint newValue, uint oldValue, bool add) private {
        if (newValue > oldValue) {
            uint diff = newValue.sub(oldValue);
            if (add) {
                _effectiveDelegatedSum.addToValue(diff, month);
            } else {
                _effectiveDelegatedSum.subtractFromValue(diff, month);
            }
        } else if (newValue < oldValue) {
            uint diff = oldValue.sub(newValue);
            if (add) {
                _effectiveDelegatedSum.subtractFromValue(diff, month);
            } else {
                _effectiveDelegatedSum.addToValue(diff, month);
            }
        }
    }

    function _getNextRewardTimestamp(uint nodeIndex, Nodes nodes, TimeHelpers timeHelpers) private view returns (uint) {
        uint lastRewardTimestamp = nodes.getNodeLastRewardDate(nodeIndex);
        uint lastRewardMonth = timeHelpers.timestampToMonth(lastRewardTimestamp);
        uint lastRewardMonthStart = timeHelpers.monthToTimestamp(lastRewardMonth);
        uint timePassedAfterMonthStart = lastRewardTimestamp.sub(lastRewardMonthStart);
        uint currentMonth = timeHelpers.getCurrentMonth();
        assert(lastRewardMonth <= currentMonth);

        if (lastRewardMonth == currentMonth) {
            uint nextMonthStart = timeHelpers.monthToTimestamp(currentMonth.add(1));
            uint nextMonthFinish = timeHelpers.monthToTimestamp(lastRewardMonth.add(2));
            if (lastRewardTimestamp < lastRewardMonthStart.add(NODE_CREATION_WINDOW_SECONDS)) {
                return nextMonthStart.sub(BOUNTY_WINDOW_SECONDS);
            } else {
                return _min(nextMonthStart.add(timePassedAfterMonthStart), nextMonthFinish.sub(BOUNTY_WINDOW_SECONDS));
            }
        } else if (lastRewardMonth.add(1) == currentMonth) {
            uint currentMonthStart = timeHelpers.monthToTimestamp(currentMonth);
            uint currentMonthFinish = timeHelpers.monthToTimestamp(lastRewardMonth.add(1));
            return _min(
                currentMonthStart.add(_max(timePassedAfterMonthStart, NODE_CREATION_WINDOW_SECONDS)),
                currentMonthFinish.sub(BOUNTY_WINDOW_SECONDS)
            );
        } else {
            uint currentMonthStart = timeHelpers.monthToTimestamp(currentMonth);
            return currentMonthStart.add(NODE_CREATION_WINDOW_SECONDS);
        }
    }

    function _min(uint a, uint b) private pure returns (uint) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }

    function _max(uint a, uint b) private pure returns (uint) {
        if (a < b) {
            return b;
        } else {
            return a;
        }
    }
}