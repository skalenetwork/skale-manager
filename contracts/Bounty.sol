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

import "./ConstantsHolder.sol";
import "./Nodes.sol";
import "./Permissions.sol";


contract Bounty is Permissions {

    uint public constant STAGE_LENGTH = 31558150; // 1 year
    uint public constant YEAR1_BOUNTY = 385e6 * 1e18;
    uint public constant YEAR2_BOUNTY = 3465e5 * 1e18;
    uint public constant YEAR3_BOUNTY = 308e6 * 1e18;
    uint public constant BOUNTY = 192e6 * 1e18;

    uint private _nextStage;
    uint private _stagePool;
    bool public bountyReduction;

    function getBounty(
        uint nodeIndex,
        uint downtime,
        uint latency
    )
        external
        allow("SkaleManager")
        returns (uint)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));

        _refillStagePool(constantsHolder);
        
        uint bounty = _calculateMaximumBountyAmount(_stagePool, _nextStage, nodeIndex, constantsHolder, nodes);

        bounty = _reduceBounty(
            bounty,
            nodeIndex,
            downtime,
            latency,
            nodes,
            constantsHolder
        );

        return bounty;
    }

    function enableBountyReduction() external onlyOwner {
        bountyReduction = true;
    }

    function disableBountyReduction() external onlyOwner {
        bountyReduction = false;
    }

    function calculateNormalBounty(uint nodeIndex) external view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));

        uint stagePoolSize;
        uint nextStage;
        (stagePoolSize, nextStage) = _getStagePoolSize(constantsHolder);
        
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
        _nextStage = 0;
        _stagePool = 0;
        bountyReduction = false;
    }

    // private

    function _calculateMaximumBountyAmount(
        uint stagePoolSize,
        uint nextStage,
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

        uint numberOfNodes = nodes.getNumberOnlineNodes();
        uint numberOfRewards = _getStageBeginningTimestamp(nextStage, constantsHolder)
            .sub(now)
            .div(constantsHolder.rewardPeriod())
            .add(1);

        return stagePoolSize.div(numberOfNodes).div(numberOfRewards);
    }

    function _getStageBeginningTimestamp(uint stage, ConstantsHolder constantsHolder) private view returns (uint) {
        return constantsHolder.launchTimestamp().add(stage.mul(STAGE_LENGTH));
    }

    function _getStagePoolSize(ConstantsHolder constantsHolder) private view returns (uint stagePool, uint nextStage) {
        stagePool = _stagePool;
        for (nextStage = _nextStage; now >= _getStageBeginningTimestamp(nextStage, constantsHolder); ++nextStage) {
            stagePool += _getStageReward(_nextStage);
        }
    }

    function _refillStagePool(ConstantsHolder constantsHolder) private {
        (_stagePool, _nextStage) = _getStagePoolSize(constantsHolder);
    }

    function _getStageReward(uint stage) private pure returns (uint) {
        if (stage >= 3) {
            return BOUNTY.div(2 ** stage.sub(3).div(3).add(1));
        } else {
            if (stage == 0) {
                return YEAR1_BOUNTY;
            } else if (stage == 1) {
                return YEAR2_BOUNTY;
            } else {
                return YEAR3_BOUNTY;
            }
        }
    }

    function _reduceBounty(
        uint bounty,
        uint nodeIndex,
        uint downtime,
        uint latency,
        Nodes nodes,
        ConstantsHolder constants
    )
        private
        returns (uint reducedBounty)
    {
        if (!bountyReduction) {
            return bounty;
        }

        reducedBounty = _reduceBountyByDowntime(bounty, nodeIndex, downtime, nodes, constants);

        if (latency > constants.allowableLatency()) {
            // reduce bounty because latency is too big
            reducedBounty = reducedBounty.mul(constants.allowableLatency()).div(latency);
        }
        
        if (!nodes.checkPossibilityToMaintainNode(nodes.getValidatorId(nodeIndex), nodeIndex)) {
            reducedBounty = reducedBounty.div(constants.MSR_REDUCING_COEFFICIENT());
        }
    }

    function _reduceBountyByDowntime(
        uint bounty,
        uint nodeIndex,
        uint downtime,
        Nodes nodes,
        ConstantsHolder constants
    )
        private
        view
        returns (uint reducedBounty)
    {
        reducedBounty = bounty;
        uint getBountyDeadline = uint(nodes.getNodeLastRewardDate(nodeIndex))
            .add(constants.rewardPeriod())
            .add(constants.deltaPeriod());
        uint numberOfExpiredIntervals;
        if (now > getBountyDeadline) {
            numberOfExpiredIntervals = now.sub(getBountyDeadline).div(constants.checkTime());
        } else {
            numberOfExpiredIntervals = 0;
        }
        uint normalDowntime = uint(constants.rewardPeriod())
            .sub(constants.deltaPeriod())
            .div(constants.checkTime())
            .div(constants.DOWNTIME_THRESHOLD_PART());
        uint totalDowntime = downtime.add(numberOfExpiredIntervals);
        if (totalDowntime > normalDowntime) {
            // reduce bounty because downtime is too big
            uint penalty = bounty
                .mul(totalDowntime)
                .div(
                    uint(constants.rewardPeriod()).sub(constants.deltaPeriod())
                        .div(constants.checkTime())
                );            
            if (bounty > penalty) {
                reducedBounty = bounty.sub(penalty);
            } else {
                reducedBounty = 0;
            }
        }
    }
}