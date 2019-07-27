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


contract SkaleManager is Permissions {

    enum TransactionOperation {CreateNode, CreateSchain}

    event BountyGot(
        uint nodeIndex,
        address owner,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint bounty,
        uint32 time,
        uint gasSpend
    );

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function tokenFallback(address from, uint value, bytes memory data) public allow("SkaleToken") {
        TransactionOperation operationType = fallbackOperationTypeConvert(data);
        if (operationType == TransactionOperation.CreateNode) {
            address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
            address validatorsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
            uint nodeIndex = INodesFunctionality(nodesFunctionalityAddress).createNode(from, value, data);
            IValidatorsFunctionality(validatorsFunctionalityAddress).addValidator(nodeIndex);
        } else if (operationType == TransactionOperation.CreateSchain) {
            address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
            //require(1 != 1, "Break");
            ISchainsFunctionality(schainsFunctionalityAddress).addSchain(from, value, data);
        }
    }

    function initWithdrawDeposit(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        require(
            INodesFunctionality(nodesFunctionalityAddress).initWithdrawDeposit(msg.sender, nodeIndex),
            "Initialization of deposit withdrawing is failed");
    }

    function completeWithdrawdeposit(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        uint amount = INodesFunctionality(nodesFunctionalityAddress).completeWithdrawDeposit(msg.sender, nodeIndex);
        address skaleTokenAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleToken")));
        require(
            ISkaleToken(skaleTokenAddress).transfer(msg.sender, amount),
            "Token transfering is failed");
    }

    function deleteNode(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        INodesFunctionality(nodesFunctionalityAddress).removeNode(msg.sender, nodeIndex);
        address validatorsFunctionalityAddress = ContractManager(contractsAddress)
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteNodeByRoot(uint nodeIndex) public onlyOwner {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        INodesFunctionality(nodesFunctionalityAddress).removeNodeByRoot(nodeIndex);
        address validatorsFunctionalityAddress = ContractManager(contractsAddress)
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteSchain(string memory name) public {
        address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, keccak256(abi.encodePacked(name)));
    }

    function deleteSchainByRoot(string memory name) public {
        address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchainByRoot(keccak256(abi.encodePacked(name)));
    }

    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) public
    {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(INodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");
        address validatorsFunctionalityAddress = ContractManager(contractsAddress)
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        IValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(
            fromValidatorIndex,
            toNodeIndex,
            downtime,
            latency);
    }

    function getBounty(uint nodeIndex) public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(INodesData(nodesDataAddress).isNodeExist(msg.sender, nodeIndex), "Node does not exist for Message sender");
        require(INodesData(nodesDataAddress).isTimeForReward(nodeIndex), "Not time for bounty");
        bool nodeIsActive = INodesData(nodesDataAddress).isNodeActive(nodeIndex);
        bool nodeIsLeaving = INodesData(nodesDataAddress).isNodeLeaving(nodeIndex);
        require(nodeIsActive || nodeIsLeaving, "Node is not Active and is not Leaving");
        uint32 averageDowntime;
        uint32 averageLatency;
        address validatorsFunctionalityAddress = ContractManager(contractsAddress).contracts(
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
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint diffTime = INodesData(nodesDataAddress).getNodeLastRewardDate(nodeIndex) +
            IConstants(constantsAddress).rewardPeriod() +
            IConstants(constantsAddress).deltaPeriod();
        address managerDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("ManagerData")));
        address skaleTokenAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleToken")));
        if (IManagerData(managerDataAddress).minersCap() == 0) {
            IManagerData(managerDataAddress).setMinersCap(ISkaleToken(skaleTokenAddress).CAP() / 3);
        }
        uint step = ((now - IManagerData(managerDataAddress).startTime()) / IConstants(constantsAddress).SIX_YEARS()) + 1;
        if (IManagerData(managerDataAddress).stageTime() + IConstants(constantsAddress).rewardPeriod() < now) {
            IManagerData(managerDataAddress).setStageTimeAndStageNodes(INodesData(nodesDataAddress).numberOfActiveNodes() + INodesData(nodesDataAddress).numberOfLeavingNodes());
        }
        commonBounty = IManagerData(managerDataAddress).minersCap() /
            ((2 ** step) * (IConstants(constantsAddress).SIX_YEARS() / IConstants(constantsAddress).rewardPeriod()) * IManagerData(managerDataAddress).stageNodes());
        if (now > diffTime) {
            diffTime = now - diffTime;
        } else {
            diffTime = 0;
        }
        int bountyForMiner = int(commonBounty);
        if (downtime > 200) {
            bountyForMiner -= int(((downtime + diffTime) * commonBounty) / (IConstants(constantsAddress).SECONDS_TO_DAY() / 4));
        }

        if (bountyForMiner > 0) {
            if (latency > 150000) {
                bountyForMiner = (150000 * bountyForMiner) / latency;
            }
            require(
                ISkaleToken(skaleTokenAddress).mint(from, uint(bountyForMiner)),
                "Minting of token is failed");
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
        bool isIdentified = operationType == bytes1(uint8(1)) || operationType == bytes1(uint8(16));
        require(isIdentified, "Operation type is not identified");
        if (operationType == bytes1(uint8(1))) {
            return TransactionOperation.CreateNode;
        } else if (operationType == bytes1(uint8(16))) {
            return TransactionOperation.CreateSchain;
        }
    }

}
