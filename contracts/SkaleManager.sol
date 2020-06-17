// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleManager.sol - SKALE Manager
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

pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./ConstantsHolder.sol";
import "./SkaleToken.sol";
import "./delegation/Distributor.sol";
import "./delegation/ValidatorService.sol";
import "./Monitors.sol";
import "./Schains.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract SkaleManager is IERC777Recipient, Permissions {
    // miners capitalization
    uint public minersCap;
    
    // time of current stage
    uint32 public stageTime;
    // amount of Nodes at current stage
    uint public stageNodes;

    IERC1820Registry private _erc1820;

    bytes32 constant private _TOKENS_RECIPIENT_INTERFACE_HASH =
        0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    event BountyGot(
        uint indexed nodeIndex,
        address owner,
        uint averageDowntime,
        uint averageLatency,
        uint bounty,
        uint previousBlockEvent,
        uint32 time,
        uint gasSpend
    );

    function tokensReceived(
        address, // operator
        address from,
        address to,
        uint256 value,
        bytes calldata userData,
        bytes calldata // operator data
    )
        external override
        allow("SkaleToken")
    {
        require(to == address(this), "Receiver is incorrect");
        if (userData.length > 0) {
            Schains schains = Schains(
                _contractManager.getContract("Schains"));
            schains.addSchain(from, value, userData);
        }
    }

    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp,
        bytes32[2] calldata publicKey,
        string calldata name)
        external
    {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));

        validatorService.checkPossibilityCreatingNode(msg.sender);
        Nodes.NodeCreationParams memory params = Nodes.NodeCreationParams({
            name: name,
            ip: ip,
            publicIp: publicIp,
            port: port,
            publicKey: publicKey,
            nonce: nonce});
        uint nodeIndex = nodes.createNode(msg.sender, params);
        validatorService.pushNode(msg.sender, nodeIndex);
        monitors.addMonitor(nodeIndex);
    }

    function nodeExit(uint nodeIndex) external {
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        uint validatorId = nodes.getValidatorId(nodeIndex);
        bool permitted = (_isOwner() || nodes.isNodeExist(msg.sender, nodeIndex));
        if (!permitted) {
            permitted = validatorService.getValidatorId(msg.sender) == validatorId;
        }
        require(permitted, "Sender is not permitted to call this function");
        Schains schains = Schains(
            _contractManager.getContract("Schains"));
        SchainsInternal schainsInternal = SchainsInternal(_contractManager.getContract("SchainsInternal"));
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        schains.freezeSchains(nodeIndex);
        if (nodes.isNodeActive(nodeIndex)) {
            require(nodes.initExit(nodeIndex), "Initialization of node exit is failed");
        }
        bool completed;
        bool isSchains = false;
        if (schainsInternal.getActiveSchain(nodeIndex) != bytes32(0)) {
            completed = schains.exitFromSchain(nodeIndex);
            isSchains = true;
        } else {
            completed = true;
        }
        if (completed) {
            require(nodes.completeExit(nodeIndex), "Finishing of node exit is failed");
            nodes.changeNodeFinishTime(nodeIndex, uint32(now + (isSchains ? constants.rotationDelay() : 0)));
            Monitors monitors = Monitors(_contractManager.getContract("Monitors"));
            monitors.deleteMonitor(nodeIndex);
            validatorService.deleteNode(validatorId, nodeIndex);
        }
    }

    function deleteSchain(string calldata name) external {
        Schains schains = Schains(_contractManager.getContract("Schains"));
        schains.deleteSchain(msg.sender, name);
    }

    function deleteSchainByRoot(string calldata name) external onlyOwner {
        Schains schains = Schains(_contractManager.getContract("Schains"));
        schains.deleteSchainByRoot(name);
    }

    function sendVerdict(uint fromMonitorIndex, Monitors.Verdict calldata verdict) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));

        require(nodes.isNodeExist(msg.sender, fromMonitorIndex), "Node does not exist for Message sender");

        monitors.sendVerdict(fromMonitorIndex, verdict);
    }

    function sendVerdicts(uint fromMonitorIndex, Monitors.Verdict[] calldata verdicts) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        require(nodes.isNodeExist(msg.sender, fromMonitorIndex), "Node does not exist for Message sender");
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));
        for (uint i = 0; i < verdicts.length; i++) {
            monitors.sendVerdict(fromMonitorIndex, verdicts[i]);
        }
    }

    function getBounty(uint nodeIndex) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        require(nodes.isNodeExist(msg.sender, nodeIndex), "Node does not exist for Message sender");
        require(nodes.isTimeForReward(nodeIndex), "Not time for bounty");
        bool nodeIsActive = nodes.isNodeActive(nodeIndex);
        bool nodeIsLeaving = nodes.isNodeLeaving(nodeIndex);
        require(nodeIsActive || nodeIsLeaving, "Node is not Active and is not Leaving");
        uint averageDowntime;
        uint averageLatency;
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));
        (averageDowntime, averageLatency) = monitors.calculateMetrics(nodeIndex);
        uint bounty = _manageBounty(
            msg.sender,
            nodeIndex,
            averageDowntime,
            averageLatency);
        nodes.changeNodeLastRewardDate(nodeIndex);
        monitors.addMonitor(nodeIndex);
        _emitBountyEvent(nodeIndex, msg.sender, averageDowntime, averageLatency, bounty);
    }

    function calculateNormalBounty() external view returns (uint) {
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));

        uint networkLaunchTimestamp = constants.launchTimestamp();
        if (now < networkLaunchTimestamp) {
            // network is not launched
            // bounty is turned off
            return 0;
        }

        uint minersCapLocal = SkaleToken(_contractManager.getContract("SkaleToken")).CAP() / 3;
        uint stageNodesLocal = stageTime;
        uint stageTimeLocal = stageTime;
        if (stageTimeLocal.add(constants.rewardPeriod()) < now) {
            stageNodesLocal = nodes.numberOfActiveNodes().add(nodes.numberOfLeavingNodes());
            stageTimeLocal = uint32(block.timestamp);
        }
        return minersCapLocal
            .div((2 ** (((now.sub(networkLaunchTimestamp))
            .div(constants.SIX_YEARS())) + 1))
            .mul((constants.SIX_YEARS()
            .div(constants.rewardPeriod())))
            .mul(stageNodesLocal));
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), _TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    function _manageBounty(
        address from,
        uint nodeIndex,
        uint downtime,
        uint latency) internal returns (uint)
    {
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));

        uint networkLaunchTimestamp = constants.launchTimestamp();
        if (now < networkLaunchTimestamp) {
            // network is not launched
            // bounty is turned off
            return 0;
        }
        if (stageTime.add(constants.rewardPeriod()) < now) {
            stageNodes = nodes.numberOfActiveNodes().add(nodes.numberOfLeavingNodes());
            stageTime = uint32(block.timestamp);
        }
        
        uint bountyAmount = _calculateMaximumBountyAmount(
            _getAndUpdateValidatorsCapitalization(),
            stageNodes,
            networkLaunchTimestamp
        );

        // reduce bounty if metrics are too bad
        bountyAmount = _reduceBounty(
            bountyAmount,
            nodeIndex,
            downtime,
            latency,
            nodes,
            constants
        );

        if (bountyAmount > 0) {
            _payBounty(bountyAmount, from, nodeIndex);
        }
        return bountyAmount;
    }

    function _payBounty(uint bountyForMiner, address miner, uint nodeIndex) internal returns (bool) {
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        SkaleToken skaleToken = SkaleToken(_contractManager.getContract("SkaleToken"));
        Distributor distributor = Distributor(_contractManager.getContract("Distributor"));

        uint validatorId = validatorService.getValidatorIdByNodeAddress(miner);
        uint bounty = bountyForMiner;
        if (!validatorService.checkPossibilityToMaintainNode(validatorId, nodeIndex)) {
            bounty /= 2;
        }
        // solhint-disable-next-line check-send-result
        skaleToken.send(address(distributor), bounty, abi.encode(validatorId));
    }

    function _emitBountyEvent(
        uint nodeIndex,
        address from,
        uint averageDowntime,
        uint averageLatency,
        uint bounty
    )
        internal
    {
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));
        uint previousBlockEvent = monitors.getLastBountyBlock(nodeIndex);
        monitors.setLastBountyBlock(nodeIndex);

        emit BountyGot(
            nodeIndex,
            from,
            averageDowntime,
            averageLatency,
            bounty,
            previousBlockEvent,
            uint32(block.timestamp),
            gasleft());
    }

    function _getAndUpdateValidatorsCapitalization() internal returns (uint) {
        if (minersCap == 0) {
            minersCap = SkaleToken(_contractManager.getContract("SkaleToken")).CAP() / 3;
        }
        return minersCap;
    }

    function _calculateMaximumBountyAmount(
        uint cap,
        uint nodesAmount,
        uint networkLaunchTimestamp
        )
        internal
        view
        returns (uint)
    {
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        
        return cap.div(
                (2 ** (now.sub(networkLaunchTimestamp).div(constants.SIX_YEARS()) + 1))
                .mul(constants.SIX_YEARS().div(constants.rewardPeriod()))
                .mul(nodesAmount)
            );
    }

    function _reduceBounty(
        uint bounty,
        uint nodeIndex,
        uint downtime,
        uint latency,
        Nodes nodes,
        ConstantsHolder constants
    )
        internal
        view
        returns (uint reducedBounty)
    {
        reducedBounty = bounty;
        uint getBountyDeadline = nodes.getNodeLastRewardDate(nodeIndex)
            .add(constants.rewardPeriod())
            .add(constants.deltaPeriod());
        uint numberOfExpiredIntervals;
        if (now > getBountyDeadline) {
            numberOfExpiredIntervals = now.sub(getBountyDeadline).div(constants.checkTime());
        } else {
            numberOfExpiredIntervals = 0;
        }
        uint normalDowntime = ((constants.rewardPeriod().sub(constants.deltaPeriod())).div(constants.checkTime())) / 30;
        uint totalDowntime = downtime.add(numberOfExpiredIntervals);
        if (totalDowntime > normalDowntime) {
            // reduce bounty because downtime is too big
            uint penalty = bounty.mul(totalDowntime).div(constants.SECONDS_TO_DAY() / 4);
            if (bounty > penalty) {
                reducedBounty = bounty - penalty;
            } else {
                reducedBounty = 0;
            }
        }

        if (latency > constants.allowableLatency()) {
            // reduce bounty because latency is too big
            reducedBounty = reducedBounty.mul(constants.allowableLatency()).div(latency);
        }
    }
}
