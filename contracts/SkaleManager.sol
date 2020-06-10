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
import "./interfaces/ISchainsFunctionality.sol";
import "./delegation/Distributor.sol";
import "./delegation/ValidatorService.sol";
import "./MonitorsFunctionality.sol";
import "./MonitorsData.sol";
import "./SchainsFunctionality.sol";
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

    enum TransactionOperation {CreateNode, CreateSchain}

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
            SchainsFunctionality schainsFunctionality = SchainsFunctionality(
                _contractManager.getContract("SchainsFunctionality"));
            schainsFunctionality.addSchain(from, value, userData);
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
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));

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
        monitorsFunctionality.addMonitor(nodeIndex);
    }

    function nodeExit(uint nodeIndex) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        SchainsFunctionality schainsFunctionality = SchainsFunctionality(
            _contractManager.getContract("SchainsFunctionality"));
        SchainsData schainsData = SchainsData(_contractManager.getContract("SchainsData"));
        ConstantsHolder constants = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        schainsFunctionality.freezeSchains(nodeIndex);
        if (nodes.isNodeActive(nodeIndex)) {
            require(nodes.initExit(msg.sender, nodeIndex), "Initialization of node exit is failed");
        }
        bool completed;
        bool schains = false;
        if (schainsData.getActiveSchain(nodeIndex) != bytes32(0)) {
            completed = schainsFunctionality.exitFromSchain(nodeIndex);
            schains = true;
        } else {
            completed = true;
        }
        if (completed) {
            require(nodes.completeExit(msg.sender, nodeIndex), "Finishing of node exit is failed");
            nodes.changeNodeFinishTime(nodeIndex, uint32(now + (schains ? constants.rotationDelay() : 0)));
        }
    }

    function deleteNode(uint nodeIndex) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        nodes.removeNode(msg.sender, nodeIndex);
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));
        monitorsFunctionality.deleteMonitor(nodeIndex);
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        uint validatorId = validatorService.getValidatorIdByNodeAddress(msg.sender);
        validatorService.deleteNode(validatorId, nodeIndex);
    }

    function deleteNodeByRoot(uint nodeIndex) external onlyOwner {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));

        nodes.removeNodeByRoot(nodeIndex);
        monitorsFunctionality.deleteMonitor(nodeIndex);
        uint validatorId = nodes.getNodeValidatorId(nodeIndex);
        validatorService.deleteNode(validatorId, nodeIndex);
    }

    function deleteSchain(string calldata name) external {
        address schainsFunctionalityAddress = _contractManager.getContract("SchainsFunctionality");
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, name);
    }

    function deleteSchainByRoot(string calldata name) external onlyOwner {
        address schainsFunctionalityAddress = _contractManager.getContract("SchainsFunctionality");
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchainByRoot(name);
    }

    function sendVerdict(uint fromMonitorIndex, MonitorsData.Verdict calldata verdict) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));

        require(nodes.isNodeExist(msg.sender, fromMonitorIndex), "Node does not exist for Message sender");

        monitorsFunctionality.sendVerdict(fromMonitorIndex, verdict);
    }

    function sendVerdicts(uint fromMonitorIndex, MonitorsData.Verdict[] calldata verdicts) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        require(nodes.isNodeExist(msg.sender, fromMonitorIndex), "Node does not exist for Message sender");
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));
        for (uint i = 0; i < verdicts.length; i++) {
            monitorsFunctionality.sendVerdict(fromMonitorIndex, verdicts[i]);
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
        MonitorsFunctionality monitorsFunctionality = MonitorsFunctionality(
            _contractManager.getContract("MonitorsFunctionality"));
        (averageDowntime, averageLatency) = monitorsFunctionality.calculateMetrics(nodeIndex);
        uint bounty = _manageBounty(
            msg.sender,
            nodeIndex,
            averageDowntime,
            averageLatency);
        nodes.changeNodeLastRewardDate(nodeIndex);
        monitorsFunctionality.upgradeMonitor(nodeIndex);
        _emitBountyEvent(nodeIndex, msg.sender, averageDowntime, averageLatency, bounty);
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
        MonitorsData monitorsData = MonitorsData(_contractManager.getContract("MonitorsData"));
        uint previousBlockEvent = monitorsData.getLastBountyBlock(nodeIndex);
        monitorsData.setLastBountyBlock(nodeIndex);
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
