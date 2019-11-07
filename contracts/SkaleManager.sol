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

pragma solidity ^0.5.0;

import "./Permissions.sol";
import "./interfaces/INodesData.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/ISkaleToken.sol";
import "./interfaces/INodesFunctionality.sol";
import "./interfaces/IValidatorsFunctionality.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/IManagerData.sol";
import "./interfaces/IDelegation.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";


contract SkaleManager is IERC777Recipient, Permissions {
    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    enum TransactionOperation {CreateNode, CreateSchain, DelegationRequest}

    event BountyGot(
        uint indexed nodeIndex,
        address owner,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint bounty,
        uint32 time,
        uint gasSpend
    );

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 value,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external
        allow("SkaleToken")
    {
        TransactionOperation operationType = fallbackOperationTypeConvert(userData);
        if (operationType == TransactionOperation.CreateNode) {
            address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
            address validatorsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
            uint nodeIndex = INodesFunctionality(nodesFunctionalityAddress).createNode(from, value, userData);
            IValidatorsFunctionality(validatorsFunctionalityAddress).addValidator(nodeIndex);
        } else if (operationType == TransactionOperation.CreateSchain) {
            address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
            ISchainsFunctionality(schainsFunctionalityAddress).addSchain(from, value, userData);
        } else if (operationType == TransactionOperation.DelegationRequest) {
            address delegationAddress = contractManager.contracts(keccak256(abi.encodePacked("Delegation")));
            IDelegation(delegationAddress).delegationRequest(from, value, userData);
        }
    }

    function initWithdrawDeposit(uint nodeIndex) external {
        address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        require(
            INodesFunctionality(nodesFunctionalityAddress).initWithdrawDeposit(msg.sender, nodeIndex),
            "Initialization of deposit withdrawing is failed");
    }

    function completeWithdrawdeposit(uint nodeIndex) external {
        address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        uint amount = INodesFunctionality(nodesFunctionalityAddress).completeWithdrawDeposit(msg.sender, nodeIndex);
        address skaleTokenAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleToken")));
        require(
            ISkaleToken(skaleTokenAddress).transfer(msg.sender, amount),
            "Token transfering is failed");
    }

    function deleteNode(uint nodeIndex) external {
        address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        INodesFunctionality(nodesFunctionalityAddress).removeNode(msg.sender, nodeIndex);
        address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteNodeByRoot(uint nodeIndex) external onlyOwner {
        address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        INodesFunctionality(nodesFunctionalityAddress).removeNodeByRoot(nodeIndex);
        address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteSchain(string calldata name) external {
        address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, name);
    }

    function deleteSchainByRoot(string calldata name) external {
        address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchainByRoot(name);
    }

    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) external
    {
        address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        require(INodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");
        address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(
            fromValidatorIndex,
            toNodeIndex,
            downtime,
            latency);
    }

    function sendVerdicts(
        uint fromValidatorIndex,
        uint[] calldata toNodeIndexes,
        uint32[] calldata downtimes,
        uint32[] calldata latencies) external
    {
        address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        require(INodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");
        require(toNodeIndexes.length == downtimes.length, "Incorrect data");
        require(latencies.length == downtimes.length, "Incorrect data");
        address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        for (uint i = 0; i < toNodeIndexes.length; i++) {
            IValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(
                fromValidatorIndex,
                toNodeIndexes[i],
                downtimes[i],
                latencies[i]);
        }
    }

    function getBounty(uint nodeIndex) external {
        address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        require(INodesData(nodesDataAddress).isNodeExist(msg.sender, nodeIndex), "Node does not exist for Message sender");
        require(INodesData(nodesDataAddress).isTimeForReward(nodeIndex), "Not time for bounty");
        bool nodeIsActive = INodesData(nodesDataAddress).isNodeActive(nodeIndex);
        bool nodeIsLeaving = INodesData(nodesDataAddress).isNodeLeaving(nodeIndex);
        require(nodeIsActive || nodeIsLeaving, "Node is not Active and is not Leaving");
        uint32 averageDowntime;
        uint32 averageLatency;
        address validatorsFunctionalityAddress = contractManager.contracts(
            keccak256(abi.encodePacked("ValidatorsFunctionality")));
        (averageDowntime, averageLatency) = IValidatorsFunctionality(validatorsFunctionalityAddress).calculateMetrics(nodeIndex);
        uint bounty = manageBounty(
            msg.sender,
            nodeIndex,
            averageDowntime,
            averageLatency,
            nodesDataAddress);
        INodesData(nodesDataAddress).changeNodeLastRewardDate(nodeIndex);
        IValidatorsFunctionality(validatorsFunctionalityAddress).upgradeValidator(nodeIndex);
        emit BountyGot(
            nodeIndex,
            msg.sender,
            averageDowntime,
            averageLatency,
            bounty,
            uint32(block.timestamp),
            gasleft());
    }

    function manageBounty(
        address from,
        uint nodeIndex,
        uint32 downtime,
        uint32 latency,
        address nodesDataAddress) internal returns (uint)
    {
        uint commonBounty;
        address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
        uint diffTime = INodesData(nodesDataAddress).getNodeLastRewardDate(nodeIndex) +
            IConstants(constantsAddress).rewardPeriod() +
            IConstants(constantsAddress).deltaPeriod();
        address managerDataAddress = contractManager.contracts(keccak256(abi.encodePacked("ManagerData")));
        address skaleTokenAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleToken")));
        if (IManagerData(managerDataAddress).minersCap() == 0) {
            IManagerData(managerDataAddress).setMinersCap(ISkaleToken(skaleTokenAddress).CAP() / 3);
        }
        if (IManagerData(managerDataAddress).stageTime() + IConstants(constantsAddress).rewardPeriod() < now) {
            IManagerData(managerDataAddress).setStageTimeAndStageNodes(INodesData(nodesDataAddress).numberOfActiveNodes() + INodesData(nodesDataAddress).numberOfLeavingNodes());
        }
        commonBounty = IManagerData(managerDataAddress).minersCap() /
            ((2 ** (((now - IManagerData(managerDataAddress).startTime()) /
            IConstants(constantsAddress).SIX_YEARS()) + 1)) *
            (IConstants(constantsAddress).SIX_YEARS() /
            IConstants(constantsAddress).rewardPeriod()) *
            IManagerData(managerDataAddress).stageNodes());
        if (now > diffTime) {
            diffTime = now - diffTime;
        } else {
            diffTime = 0;
        }
        diffTime /= IConstants(constantsAddress).checkTime();
        int bountyForMiner = int(commonBounty);
        uint normalDowntime = ((IConstants(constantsAddress).rewardPeriod() - IConstants(constantsAddress).deltaPeriod()) /
            IConstants(constantsAddress).checkTime()) / 30;
        if (downtime + diffTime > normalDowntime) {
            bountyForMiner -= int(((downtime + diffTime) * commonBounty) / (IConstants(constantsAddress).SECONDS_TO_DAY() / 4));
        }

        if (bountyForMiner > 0) {
            if (latency > IConstants(constantsAddress).allowableLatency()) {
                bountyForMiner = (IConstants(constantsAddress).allowableLatency() * bountyForMiner) / latency;
            }
            require(
                ISkaleToken(skaleTokenAddress).mint(
                    address(0),
                    from,
                    uint(bountyForMiner),
                    bytes(""),
                    bytes("")
                ), "Minting of token is failed"
            );
        } else {
            //Need to add penalty
            bountyForMiner = 0;
        }
        return uint(bountyForMiner);
    }

    function fallbackOperationTypeConvert(bytes memory data) internal pure returns (TransactionOperation) {
        bytes1 operationType;
        assembly {
            operationType := mload(add(data, 0x20))
        }
        bool isIdentified = operationType == bytes1(uint8(1)) ||
            operationType == bytes1(uint8(16)) ||
            operationType == bytes1(uint8(2));
        require(isIdentified, "Operation type is not identified");
        if (operationType == bytes1(uint8(1))) {
            return TransactionOperation.CreateNode;
        } else if (operationType == bytes1(uint8(16))) {
            return TransactionOperation.CreateSchain;
        } else if (operationType == bytes1(uint8(2))) {
            return TransactionOperation.DelegationRequest;
        }
    }

}
