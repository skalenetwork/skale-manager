// SPDX-License-Identifier: AGPL-3.0-only

/*
    ConstantsHolder.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin

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

import { IConstantsHolder } from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";

import { Permissions } from "./Permissions.sol";


/**
 * @title ConstantsHolder
 * @dev Contract contains constants and common variables for the SKALE Network.
 */
contract ConstantsHolder is Permissions, IConstantsHolder {

    // initial price for creating Node (100 SKL)
    uint256 public constant override NODE_DEPOSIT = 100 * 1e18;

    uint8 public constant override TOTAL_SPACE_ON_NODE = 128;

    // part of Node for Small Skale-chain (1/128 of Node)
    uint8 public constant override SMALL_DIVISOR = 128;

    // part of Node for Medium Skale-chain (1/32 of Node)
    uint8 public constant MEDIUM_DIVISOR = 32;

    // part of Node for Large Skale-chain (full Node)
    uint8 public constant LARGE_DIVISOR = 1;

    // part of Node for Medium Test Skale-chain (1/4 of Node)
    uint8 public constant MEDIUM_TEST_DIVISOR = 4;

    // typically number of Nodes for Skale-chain (16 Nodes)
    uint256 public constant NUMBER_OF_NODES_FOR_SCHAIN = 16;

    // number of Nodes for Test Skale-chain (2 Nodes)
    uint256 public constant NUMBER_OF_NODES_FOR_TEST_SCHAIN = 2;

    // number of Nodes for Test Skale-chain (4 Nodes)
    uint256 public constant NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN = 4;

    // number of seconds in one year
    uint32 public constant override SECONDS_TO_YEAR = 31622400;

    // initial number of monitors
    uint256 public constant NUMBER_OF_MONITORS = 24;

    uint256 public constant OPTIMAL_LOAD_PERCENTAGE = 80;

    uint256 public constant ADJUSTMENT_SPEED = 1000;

    uint256 public constant COOLDOWN_TIME = 60;

    uint256 public constant MIN_PRICE = 10**6;

    uint256 public constant MSR_REDUCING_COEFFICIENT = 2;

    uint256 public constant DOWNTIME_THRESHOLD_PART = 30;

    uint256 public constant BOUNTY_LOCKUP_MONTHS = 2;

    uint256 public constant ALRIGHT_DELTA = 134161;
    uint256 public constant BROADCAST_DELTA = 177490;
    uint256 public constant COMPLAINT_BAD_DATA_DELTA = 80995;
    uint256 public constant PRE_RESPONSE_DELTA = 114620;
    uint256 public constant COMPLAINT_DELTA = 203463;
    uint256 public constant RESPONSE_DELTA = 55111;

    // MSR - Minimum staking requirement
    uint256 public msr;

    // Reward period - 30 days (each 30 days Node would be granted for bounty)
    uint32 public rewardPeriod;

    // Allowable latency - 150000 ms by default
    uint32 public allowableLatency;

    /**
     * Delta period - 1 hour (1 hour before Reward period became Monitors need
     * to send Verdicts and 1 hour after Reward period became Node need to come
     * and get Bounty)
     */
    uint32 public deltaPeriod;

    /**
     * Check time - 2 minutes (every 2 minutes monitors should check metrics
     * from checked nodes)
     */
    uint256 public checkTime;

    //Need to add minimal allowed parameters for verdicts

    uint256 public launchTimestamp;

    uint256 public rotationDelay;

    uint256 public proofOfUseLockUpPeriodDays;

    uint256 public proofOfUseDelegationPercentage;

    uint256 public limitValidatorsPerDelegator;

    uint256 public firstDelegationsMonth; // deprecated

    // date when schains will be allowed for creation
    uint256 public schainCreationTimeStamp;

    uint256 public minimalSchainLifetime;

    uint256 public complaintTimeLimit;

    uint256 public minNodeBalance;

    bytes32 public constant CONSTANTS_HOLDER_MANAGER_ROLE =
        keccak256("CONSTANTS_HOLDER_MANAGER_ROLE");

    modifier onlyConstantsHolderManager() {
        require(
            hasRole(CONSTANTS_HOLDER_MANAGER_ROLE, msg.sender),
            "CONSTANTS_HOLDER_MANAGER_ROLE is required"
        );
        _;
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);

        msr = 0;
        rewardPeriod = 2592000;
        allowableLatency = 150000;
        deltaPeriod = 3600;
        checkTime = 300;
        launchTimestamp = type(uint).max;
        rotationDelay = 12 hours;
        proofOfUseLockUpPeriodDays = 90;
        proofOfUseDelegationPercentage = 50;
        limitValidatorsPerDelegator = 20;
        firstDelegationsMonth = 0;
        complaintTimeLimit = 1800;
        minNodeBalance = 1.5 ether;
    }

    /**
     * @dev Allows the Owner to set new reward and delta periods
     * This function is only for tests.
     */
    function setPeriods(
        uint32 newRewardPeriod,
        uint32 newDeltaPeriod
    )
        external
        override
        onlyConstantsHolderManager
    {
        require(
            newRewardPeriod >= newDeltaPeriod && newRewardPeriod - newDeltaPeriod >= checkTime,
            "Incorrect Periods"
        );
        emit ConstantUpdated(
            keccak256(abi.encodePacked("RewardPeriod")),
            uint(rewardPeriod),
            uint(newRewardPeriod)
        );
        rewardPeriod = newRewardPeriod;
        emit ConstantUpdated(
            keccak256(abi.encodePacked("DeltaPeriod")),
            uint(deltaPeriod),
            uint(newDeltaPeriod)
        );
        deltaPeriod = newDeltaPeriod;
    }

    /**
     * @dev Allows the Owner to set the new check time.
     * This function is only for tests.
     */
    function setCheckTime(uint256 newCheckTime) external override onlyConstantsHolderManager {
        require(rewardPeriod - deltaPeriod >= checkTime, "Incorrect check time");
        emit ConstantUpdated(
            keccak256(abi.encodePacked("CheckTime")),
            uint(checkTime),
            uint(newCheckTime)
        );
        checkTime = newCheckTime;
    }

    /**
     * @dev Allows the Owner to set the allowable latency in milliseconds.
     * This function is only for testing purposes.
     */
    function setLatency(uint32 newAllowableLatency) external override onlyConstantsHolderManager {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("AllowableLatency")),
            uint(allowableLatency),
            uint(newAllowableLatency)
        );
        allowableLatency = newAllowableLatency;
    }

    /**
     * @dev Allows the Owner to set the minimum stake requirement.
     */
    function setMSR(uint256 newMSR) external override onlyConstantsHolderManager {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("MSR")),
            uint(msr),
            uint(newMSR)
        );
        msr = newMSR;
    }

    /**
     * @dev Allows the Owner to set the launch timestamp.
     */
    function setLaunchTimestamp(uint256 timestamp) external override onlyConstantsHolderManager {
        require(
            block.timestamp < launchTimestamp,
            "Cannot set network launch timestamp because network is already launched"
        );
        emit ConstantUpdated(
            keccak256(abi.encodePacked("LaunchTimestamp")),
            uint(launchTimestamp),
            uint(timestamp)
        );
        launchTimestamp = timestamp;
    }

    /**
     * @dev Allows the Owner to set the node rotation delay.
     */
    function setRotationDelay(uint256 newDelay) external override onlyConstantsHolderManager {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("RotationDelay")),
            uint(rotationDelay),
            uint(newDelay)
        );
        rotationDelay = newDelay;
    }

    /**
     * @dev Allows the Owner to set the proof-of-use lockup period.
     */
    function setProofOfUseLockUpPeriod(
        uint256 periodDays
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("ProofOfUseLockUpPeriodDays")),
            uint(proofOfUseLockUpPeriodDays),
            uint(periodDays)
        );
        proofOfUseLockUpPeriodDays = periodDays;
    }

    /**
     * @dev Allows the Owner to set the proof-of-use delegation percentage
     * requirement.
     */
    function setProofOfUseDelegationPercentage(
        uint256 percentage
    )
        external
        override
        onlyConstantsHolderManager
    {
        require(percentage <= 100, "Percentage value is incorrect");
        emit ConstantUpdated(
            keccak256(abi.encodePacked("ProofOfUseDelegationPercentage")),
            uint(proofOfUseDelegationPercentage),
            uint(percentage)
        );
        proofOfUseDelegationPercentage = percentage;
    }

    /**
     * @dev Allows the Owner to set the maximum number of validators that a
     * single delegator can delegate to.
     */
    function setLimitValidatorsPerDelegator(
        uint256 newLimit
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("LimitValidatorsPerDelegator")),
            uint(limitValidatorsPerDelegator),
            uint(newLimit)
        );
        limitValidatorsPerDelegator = newLimit;
    }

    function setSchainCreationTimeStamp(
        uint256 timestamp
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("SchainCreationTimeStamp")),
            uint(schainCreationTimeStamp),
            uint(timestamp)
        );
        schainCreationTimeStamp = timestamp;
    }

    function setMinimalSchainLifetime(
        uint256 lifetime
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("MinimalSchainLifetime")),
            uint(minimalSchainLifetime),
            uint(lifetime)
        );
        minimalSchainLifetime = lifetime;
    }

    function setComplaintTimeLimit(
        uint256 timeLimit
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("ComplaintTimeLimit")),
            uint(complaintTimeLimit),
            uint(timeLimit)
        );
        complaintTimeLimit = timeLimit;
    }

    function setMinNodeBalance(
        uint256 newMinNodeBalance
    )
        external
        override
        onlyConstantsHolderManager
    {
        emit ConstantUpdated(
            keccak256(abi.encodePacked("MinNodeBalance")),
            uint(minNodeBalance),
            uint(newMinNodeBalance)
        );
        minNodeBalance = newMinNodeBalance;
    }

    function reinitialize() external override reinitializer(2) {
        minNodeBalance = 1.5 ether;
    }
}
