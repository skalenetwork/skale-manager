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

pragma solidity 0.8.17;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";
import { IBountyV2 } from "@skalenetwork/skale-manager-interfaces/IBountyV2.sol";
import {
    IDelegationController
} from "@skalenetwork/skale-manager-interfaces/delegation/IDelegationController.sol";
import { ITimeHelpers } from "@skalenetwork/skale-manager-interfaces/delegation/ITimeHelpers.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";

import { Permissions } from "./Permissions.sol";
import { ConstantsHolder } from "./ConstantsHolder.sol";
import { PartialDifferences } from "./delegation/PartialDifferences.sol";


contract BountyV2 is Permissions, IBountyV2 {
    using PartialDifferences for PartialDifferences.Value;
    using PartialDifferences for PartialDifferences.Sequence;

    struct BountyHistory {
        uint256 month;
        uint256 bountyPaid;
    }

    // TODO: replace with an array when solidity starts supporting it
    uint256 public constant YEAR1_BOUNTY = 3850e5 * 1e18;
    uint256 public constant YEAR2_BOUNTY = 3465e5 * 1e18;
    uint256 public constant YEAR3_BOUNTY = 3080e5 * 1e18;
    uint256 public constant YEAR4_BOUNTY = 2695e5 * 1e18;
    uint256 public constant YEAR5_BOUNTY = 2310e5 * 1e18;
    uint256 public constant YEAR6_BOUNTY = 1925e5 * 1e18;
    uint256 public constant EPOCHS_PER_YEAR = 12;
    uint256 public constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 public constant BOUNTY_WINDOW_SECONDS = 3 * SECONDS_PER_DAY;

    bytes32 public constant BOUNTY_REDUCTION_MANAGER_ROLE =
        keccak256("BOUNTY_REDUCTION_MANAGER_ROLE");

    uint256 private _nextEpoch;
    uint256 private _epochPool;
    uint256 private _bountyWasPaidInCurrentEpoch;
    bool public bountyReduction;
    uint256 public nodeCreationWindowSeconds;

    PartialDifferences.Value private _effectiveDelegatedSum;
    // validatorId   amount of nodes
    mapping (uint256 => uint256) public nodesByValidator; // deprecated

    // validatorId => BountyHistory
    mapping (uint256 => BountyHistory) private _bountyHistory;

    uint256 public psrActivationMonth;

    event PsrActivationMonthChanged(
        uint256 oldValue,
        uint256 newValue
    );

    modifier onlyBountyReductionManager() {
        require(
            hasRole(BOUNTY_REDUCTION_MANAGER_ROLE, msg.sender),
            "BOUNTY_REDUCTION_MANAGER_ROLE is required"
        );
        _;
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
        _nextEpoch = 0;
        _epochPool = 0;
        _bountyWasPaidInCurrentEpoch = 0;
        bountyReduction = false;
        nodeCreationWindowSeconds = 3 * SECONDS_PER_DAY;
        psrActivationMonth = 0;
    }

    function calculateBounty(uint256 nodeIndex)
        external
        override
        allow("SkaleManager")
        returns (uint256 bounty)
    {
        ConstantsHolder constantsHolder =
            ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        ITimeHelpers timeHelpers = ITimeHelpers(contractManager.getContract("TimeHelpers"));
        IDelegationController delegationController =
            IDelegationController(contractManager.getContract("DelegationController"));

        require(
            _getNextRewardTimestamp(nodeIndex, nodes, timeHelpers) <= block.timestamp,
            "Transaction is sent too early"
        );

        uint256 validatorId = nodes.getValidatorId(nodeIndex);
        if (nodesByValidator[validatorId] > 0) {
            delete nodesByValidator[validatorId];
        }

        uint256 currentMonth = timeHelpers.getCurrentMonth();
        _refillEpochPool(currentMonth, timeHelpers, constantsHolder);
        _prepareBountyHistory(validatorId, currentMonth);

        bounty = _calculateMaximumBountyAmount({
            epochPoolSize: _epochPool,
            effectiveDelegatedSum: _effectiveDelegatedSum.getAndUpdateValue(currentMonth),
            bountyWasPaidInCurrentEpoch: _bountyWasPaidInCurrentEpoch,
            nodeIndex: nodeIndex,
            bountyPaidToTheValidator: _bountyHistory[validatorId].bountyPaid,
            effectiveDelegated: delegationController.getAndUpdateEffectiveDelegatedToValidator(
                validatorId,
                currentMonth
            ),
            delegated: delegationController.getAndUpdateDelegatedToValidatorNow(validatorId),
            constantsHolder: constantsHolder,
            nodes: nodes
        });
        _bountyHistory[validatorId].bountyPaid = _bountyHistory[validatorId].bountyPaid + bounty;
        bounty = _reduceBounty(
            bounty,
            nodeIndex,
            nodes,
            constantsHolder
        );
        _epochPool = _epochPool - bounty;
        _bountyWasPaidInCurrentEpoch = _bountyWasPaidInCurrentEpoch + bounty;
        return bounty;
    }

    function enableBountyReduction() external override onlyBountyReductionManager {
        bountyReduction = true;
        emit BountyReduction(true);
    }

    function disableBountyReduction() external override onlyBountyReductionManager {
        bountyReduction = false;
        emit BountyReduction(false);
    }

    function setNodeCreationWindowSeconds(uint256 window) external override allow("Nodes") {
        emit NodeCreationWindowWasChanged(nodeCreationWindowSeconds, window);
        nodeCreationWindowSeconds = window;
    }

    function setPsrActivationMonth(uint256 month) external override onlyOwner {
        emit PsrActivationMonthChanged(psrActivationMonth, month);
        psrActivationMonth = month;
    }

    function handleDelegationAdd(
        uint256 amount,
        uint256 month
    )
        external
        override
        allow("DelegationController")
    {
        _effectiveDelegatedSum.addToValue(amount, month);
    }

    function handleDelegationRemoving(
        uint256 amount,
        uint256 month
    )
        external
        override
        allow("DelegationController")
    {
        _effectiveDelegatedSum.subtractFromValue(amount, month);
    }

    function estimateBounty(uint256 nodeIndex) external view override returns (uint256 bounty) {
        ConstantsHolder constantsHolder =
            ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        ITimeHelpers timeHelpers = ITimeHelpers(contractManager.getContract("TimeHelpers"));
        IDelegationController delegationController = IDelegationController(
            contractManager.getContract("DelegationController")
        );

        uint256 currentMonth = timeHelpers.getCurrentMonth();
        uint256 validatorId = nodes.getValidatorId(nodeIndex);

        uint256 stagePoolSize;
        (stagePoolSize, ) = _getEpochPool(currentMonth, timeHelpers, constantsHolder);

        return _calculateMaximumBountyAmount({
            epochPoolSize: stagePoolSize,
            effectiveDelegatedSum: _effectiveDelegatedSum.getValue(currentMonth),
            bountyWasPaidInCurrentEpoch: _nextEpoch == currentMonth + 1 ?
                _bountyWasPaidInCurrentEpoch :
                0,
            nodeIndex: nodeIndex,
            bountyPaidToTheValidator: _getBountyPaid(validatorId, currentMonth),
            effectiveDelegated: delegationController.getEffectiveDelegatedToValidator(
                validatorId, currentMonth
            ),
            delegated: delegationController.getDelegatedToValidator(validatorId, currentMonth),
            constantsHolder: constantsHolder,
            nodes: nodes
        });
    }

    function getNextRewardTimestamp(
        uint256 nodeIndex
    )
        external
        view
        override
        returns (uint256 timestamp)
    {
        return _getNextRewardTimestamp(
            nodeIndex,
            INodes(contractManager.getContract("Nodes")),
            ITimeHelpers(contractManager.getContract("TimeHelpers"))
        );
    }

    function getEffectiveDelegatedSum() external view override returns (uint256[] memory amount) {
        return _effectiveDelegatedSum.getValues();
    }

    function getRequiredDelegationAmount(
        uint256 nodesNumber
    )
        external
        view
        override
        returns (uint256 requiredDelegationAmount)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(
            contractManager.getContract("ConstantsHolder")
        );
        return _getRequiredDelegationAmount(nodesNumber, constantsHolder.msr());
    }

    function getRequiredNodesNumber(
        uint256 delegatedValue
    )
        public
        view
        override
        returns (uint256 requiredNodesNumber)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(
            contractManager.getContract("ConstantsHolder")
        );
        uint256 msr = constantsHolder.msr();
        if (msr == 0) {
            return type(uint256).max;
        }

        // TODO: remove this check after progressive MSR activation
        if (psrActivationMonth > 0) {
            if (psrActivationMonth <
                contractManager.getTimeHelpers().getCurrentMonth()) {
                return delegatedValue / msr;
            }
        }

        if (delegatedValue < msr) {
            return 0;
        } else if (delegatedValue < 3 * msr) {
            return 1;
        } else if (delegatedValue < 6 * msr) {
            return 2;
        } else {
            return (Math.sqrt(8 * delegatedValue / msr + 1) - 1) / 2;
        }
    }

    // private

    function _refillEpochPool(
        uint256 currentMonth,
        ITimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
    {
        uint256 epochPool;
        uint256 nextEpoch;
        (epochPool, nextEpoch) = _getEpochPool(currentMonth, timeHelpers, constantsHolder);
        if (_nextEpoch < nextEpoch) {
            (_epochPool, _nextEpoch) = (epochPool, nextEpoch);
            _bountyWasPaidInCurrentEpoch = 0;
        }
    }

    function _reduceBounty(
        uint256 bounty,
        uint256 nodeIndex,
        INodes nodes,
        ConstantsHolder constants
    )
        private
        returns (uint256 reducedBounty)
    {
        if (!bountyReduction) {
            return bounty;
        }

        reducedBounty = bounty;

        if (!nodes.checkPossibilityToMaintainNode(nodes.getValidatorId(nodeIndex), nodeIndex)) {
            reducedBounty = reducedBounty / constants.MSR_REDUCING_COEFFICIENT();
        }
    }

    function _prepareBountyHistory(uint256 validatorId, uint256 currentMonth) private {
        if (_bountyHistory[validatorId].month < currentMonth) {
            _bountyHistory[validatorId].month = currentMonth;
            delete _bountyHistory[validatorId].bountyPaid;
        }
    }

    function _calculateMaximumBountyAmount(
        uint256 epochPoolSize,
        uint256 effectiveDelegatedSum,
        uint256 bountyWasPaidInCurrentEpoch,
        uint256 nodeIndex,
        uint256 bountyPaidToTheValidator,
        uint256 effectiveDelegated,
        uint256 delegated,
        ConstantsHolder constantsHolder,
        INodes nodes
    )
        private
        view
        returns (uint256 bounty)
    {
        if (nodes.isNodeLeft(nodeIndex)) {
            return 0;
        }

        if (block.timestamp < constantsHolder.launchTimestamp()) {
            // network is not launched
            // bounty is turned off
            return 0;
        }

        if (effectiveDelegatedSum == 0) {
            // no delegations in the system
            return 0;
        }

        if (constantsHolder.msr() == 0) {
            return 0;
        }

        bounty = _calculateBountyShare({
            monthBounty: epochPoolSize + bountyWasPaidInCurrentEpoch,
            effectiveDelegated: effectiveDelegated,
            effectiveDelegatedSum: effectiveDelegatedSum,
            maxNodesAmount: getRequiredNodesNumber(delegated),
            paidToValidator: bountyPaidToTheValidator
        });

        return bounty;
    }

    function _getFirstEpoch(
        ITimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
        view
        returns (uint256 month)
    {
        return timeHelpers.timestampToMonth(constantsHolder.launchTimestamp());
    }

    function _getEpochPool(
        uint256 currentMonth,
        ITimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
        view
        returns (uint256 epochPool, uint256 nextEpoch)
    {
        epochPool = _epochPool;
        for (nextEpoch = _nextEpoch; nextEpoch <= currentMonth; ++nextEpoch) {
            epochPool = epochPool + _getEpochReward(nextEpoch, timeHelpers, constantsHolder);
        }
    }

    function _getEpochReward(
        uint256 epoch,
        ITimeHelpers timeHelpers,
        ConstantsHolder constantsHolder
    )
        private
        view
        returns (uint256 reward)
    {
        uint256 firstEpoch = _getFirstEpoch(timeHelpers, constantsHolder);
        if (epoch < firstEpoch) {
            return 0;
        }
        uint256 epochIndex = epoch - firstEpoch;
        uint256 year = epochIndex / EPOCHS_PER_YEAR;
        if (year >= 6) {
            uint256 power = (year - 6) / 3 + 1;
            if (power < 256) {
                return YEAR6_BOUNTY / 2 ** power / EPOCHS_PER_YEAR;
            } else {
                return 0;
            }
        } else {
            uint256[6] memory customBounties = [
                YEAR1_BOUNTY,
                YEAR2_BOUNTY,
                YEAR3_BOUNTY,
                YEAR4_BOUNTY,
                YEAR5_BOUNTY,
                YEAR6_BOUNTY
            ];
            return customBounties[year] / EPOCHS_PER_YEAR;
        }
    }

    function _getBountyPaid(
        uint256 validatorId,
        uint256 month
    )
        private
        view
        returns (uint256 amount)
    {
        require(_bountyHistory[validatorId].month <= month, "Can't get bounty paid");
        if (_bountyHistory[validatorId].month == month) {
            return _bountyHistory[validatorId].bountyPaid;
        } else {
            return 0;
        }
    }

    function _getNextRewardTimestamp(uint256 nodeIndex, INodes nodes, ITimeHelpers timeHelpers)
        private
        view
        returns (uint256 timestamp)
    {
        uint256 lastRewardTimestamp = nodes.getNodeLastRewardDate(nodeIndex);
        uint256 lastRewardMonth = timeHelpers.timestampToMonth(lastRewardTimestamp);
        uint256 lastRewardMonthStart = timeHelpers.monthToTimestamp(lastRewardMonth);
        uint256 timePassedAfterMonthStart = lastRewardTimestamp - lastRewardMonthStart;
        uint256 currentMonth = timeHelpers.getCurrentMonth();
        assert(lastRewardMonth <= currentMonth);

        if (lastRewardMonth == currentMonth) {
            uint256 nextMonthStart = timeHelpers.monthToTimestamp(currentMonth + 1);
            uint256 nextMonthFinish = timeHelpers.monthToTimestamp(lastRewardMonth + 2);
            if (lastRewardTimestamp < lastRewardMonthStart + nodeCreationWindowSeconds) {
                return nextMonthStart - BOUNTY_WINDOW_SECONDS;
            } else {
                return Math.min(
                    nextMonthStart + timePassedAfterMonthStart,
                    nextMonthFinish - BOUNTY_WINDOW_SECONDS
                );
            }
        } else if (lastRewardMonth + 1 == currentMonth) {
            uint256 currentMonthStart = timeHelpers.monthToTimestamp(currentMonth);
            uint256 currentMonthFinish = timeHelpers.monthToTimestamp(currentMonth + 1);
            return Math.min(
                currentMonthStart + Math.max(timePassedAfterMonthStart, nodeCreationWindowSeconds),
                currentMonthFinish - BOUNTY_WINDOW_SECONDS
            );
        } else {
            uint256 currentMonthStart = timeHelpers.monthToTimestamp(currentMonth);
            return currentMonthStart + nodeCreationWindowSeconds;
        }
    }

    function _getRequiredDelegationAmount(
        uint256 nodesNumber,
        uint256 msr
    )
        private
        view
        returns (uint256 requiredDelegationAmount)
    {
        // TODO: remove this check after progressive MSR activation
        if (psrActivationMonth > 0) {
            if (psrActivationMonth <
                contractManager.getTimeHelpers().getCurrentMonth()) {
                return nodesNumber * msr;
            }
        }
        requiredDelegationAmount = msr * nodesNumber * (nodesNumber + 1) / 2;
    }

    function _calculateBountyShare(
        uint256 monthBounty,
        uint256 effectiveDelegated,
        uint256 effectiveDelegatedSum,
        uint256 maxNodesAmount,
        uint256 paidToValidator
    )
        private
        pure
        returns (uint256 share)
    {
        if (maxNodesAmount > 0) {
            uint256 totalBountyShare = monthBounty * effectiveDelegated / effectiveDelegatedSum;
            return Math.min(
                totalBountyShare / maxNodesAmount,
                totalBountyShare - paidToValidator
            );
        } else {
            return 0;
        }
    }
}
