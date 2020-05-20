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

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/ISkaleToken.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/IManagerData.sol";
import "./delegation/Distributor.sol";
import "./delegation/ValidatorService.sol";
import "./Monitors.sol";
import "./SchainsFunctionality.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";


contract SkaleManager is IERC777Recipient, Permissions {
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
        bytes calldata publicKey,
        string calldata name)
        external
    {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));

        nodes.checkPossibilityCreatingNode(msg.sender);
        Nodes.NodeCreationParams memory params = Nodes.NodeCreationParams({
            name: name,
            ip: ip,
            publicIp: publicIp,
            port: port,
            publicKey: publicKey,
            nonce: nonce});
        uint nodeIndex = nodes.createNode(msg.sender, params);
        nodes.pushNode(msg.sender, nodeIndex);
        monitors.addMonitor(nodeIndex);
    }

    function nodeExit(uint nodeIndex) external {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        SchainsFunctionality schainsFunctionality = SchainsFunctionality(
            _contractManager.getContract("SchainsFunctionality"));
        SchainsData schainsData = SchainsData(_contractManager.getContract("SchainsData"));
        IConstants constants = IConstants(_contractManager.getContract("ConstantsHolder"));
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
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));
        monitors.deleteMonitor(nodeIndex);
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        uint validatorId = validatorService.getValidatorIdByNodeAddress(msg.sender);
        nodes.deleteNode(validatorId, nodeIndex);
    }

    function deleteNodeByRoot(uint nodeIndex) external onlyOwner {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        Monitors monitors = Monitors(_contractManager.getContract("Monitors"));

        nodes.removeNodeByRoot(nodeIndex);
        monitors.deleteMonitor(nodeIndex);
        uint validatorId = nodes.getNodeValidatorId(nodeIndex);
        nodes.deleteNode(validatorId, nodeIndex);
    }

    function deleteSchain(string calldata name) external {
        address schainsFunctionalityAddress = _contractManager.getContract("SchainsFunctionality");
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, name);
    }

    function deleteSchainByRoot(string calldata name) external onlyOwner {
        address schainsFunctionalityAddress = _contractManager.getContract("SchainsFunctionality");
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchainByRoot(name);
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
        monitors.upgradeMonitor(nodeIndex);
        emit BountyGot(
            nodeIndex,
            msg.sender,
            averageDowntime,
            averageLatency,
            bounty,
            uint32(block.timestamp),
            gasleft());
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
        uint commonBounty;
        IConstants constants = IConstants(_contractManager.getContract("ConstantsHolder"));
        IManagerData managerData = IManagerData(_contractManager.getContract("ManagerData"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));

        uint diffTime = nodes.getNodeLastRewardDate(nodeIndex)
            .add(constants.rewardPeriod())
            .add(constants.deltaPeriod());
        if (managerData.minersCap() == 0) {
            managerData.setMinersCap(ISkaleToken(_contractManager.getContract("SkaleToken")).CAP() / 3);
        }
        if (managerData.stageTime().add(constants.rewardPeriod()) < now) {
            managerData.setStageTimeAndStageNodes(nodes.numberOfActiveNodes().add(nodes.numberOfLeavingNodes()));
        }
        commonBounty = managerData.minersCap()
            .div((2 ** (((now.sub(managerData.startTime()))
            .div(constants.SIX_YEARS())) + 1))
            .mul((constants.SIX_YEARS()
            .div(constants.rewardPeriod())))
            .mul(managerData.stageNodes()));
        if (now > diffTime) {
            diffTime = now.sub(diffTime);
        } else {
            diffTime = 0;
        }
        diffTime = diffTime.div(constants.checkTime());
        int bountyForMiner = int(commonBounty);
        uint normalDowntime = ((constants.rewardPeriod().sub(constants.deltaPeriod())).div(constants.checkTime())) / 30;
        if (downtime.add(diffTime) > normalDowntime) {
            bountyForMiner -= int(((downtime.add(diffTime)).mul(commonBounty)) / (constants.SECONDS_TO_DAY() / 4));
        }

        if (bountyForMiner > 0) {
            if (latency > constants.allowableLatency()) {
                bountyForMiner = int((constants.allowableLatency().mul(uint(bountyForMiner))).div(latency));
            }
            _payBounty(uint(bountyForMiner), from, nodeIndex);
        } else {
            //Need to add penalty
            bountyForMiner = 0;
        }
        return uint(bountyForMiner);
    }

    function _payBounty(uint bountyForMiner, address miner, uint nodeIndex) internal returns (bool) {
        ValidatorService validatorService = ValidatorService(_contractManager.getContract("ValidatorService"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        SkaleToken skaleToken = SkaleToken(_contractManager.getContract("SkaleToken"));
        Distributor distributor = Distributor(_contractManager.getContract("Distributor"));

        uint validatorId = validatorService.getValidatorIdByNodeAddress(miner);
        uint bounty = bountyForMiner;
        if (!nodes.checkPossibilityToMaintainNode(validatorId, nodeIndex)) {
            bounty /= 2;
        }
        // solhint-disable-next-line check-send-result
        skaleToken.send(address(distributor), bounty, abi.encode(validatorId));
    }
}
