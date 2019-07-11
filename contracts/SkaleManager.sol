pragma solidity ^0.5.0;

import "./Permissions.sol";
//import './ValidatorsFunctionality.sol';
//import './INodesFunctionality.sol';
//import './SchainsFunctionality.sol';
//import './SkaleToken.sol';
//import './ManagerData.sol';

interface ISkaleToken {
    function transfer(address to, uint value) external returns (bool success);
    function mint(address to, uint value) external returns (bool success);
    function cap() external view returns (uint);
}

interface IConstants {
    function rewardPeriod() external view returns (uint);
    function deltaPeriod() external view returns (uint);
    function SIX_YEARS() external view returns (uint32);
    function SECONDS_TO_DAY() external view returns (uint32);
}

interface INodesData {
    function changeNodeLastRewardDate(uint nodeIndex) external;
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function isNodeLeaving(uint nodeIndex) external view returns (bool);
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32);
    function numberOfActiveNodes() external view returns (uint);
    function numberOfLeavingNodes() external view returns (uint);
}

interface INodesFunctionality {
    function createNode(address from, uint value, bytes calldata data) external returns (uint);
    function initWithdrawDeposit(address from, uint nodeIndex) external;
    function completeWithdrawDeposit(address from, uint nodeIndex) external returns (uint);
    function removeNode(address from, uint nodeIndex) external;
}

interface IValidatorsFunctionality {
    function addValidator(uint nodeIndex) external;
    function upgradeValidator(uint nodeIndex) external;
    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) external;
    function calculateMetrics(uint nodeIndex) external returns (uint32, uint32);
}

interface ISchainsFunctionality {
    function addSchain(address from, uint value, bytes calldata data) external;
    function deleteSchain(address from, bytes32 schainId) external;
}

interface IManagerData {
    function setMinersCap(uint newMinersCap) external;
    function setStageTimeAndStageNodes(uint newStageNodes) external;
    function minersCap() external view returns (uint);
    function startTime() external view returns (uint32);
    function stageTime() external view returns (uint32);
    function stageNodes() external view returns (uint);
}


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
        INodesFunctionality(nodesFunctionalityAddress).initWithdrawDeposit(msg.sender, nodeIndex);
    }

    function completeWithdrawdeposit(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        uint amount = INodesFunctionality(nodesFunctionalityAddress).completeWithdrawDeposit(msg.sender, nodeIndex);
        address skaleTokenAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleToken")));
        ISkaleToken(skaleTokenAddress).transfer(msg.sender, amount);
    }

    function deleteNode(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        INodesFunctionality(nodesFunctionalityAddress).removeNode(msg.sender, nodeIndex);
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

    function deleteSchain(string memory name) public {
        address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, keccak256(abi.encodePacked(name)));
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
            IManagerData(managerDataAddress).setMinersCap(ISkaleToken(skaleTokenAddress).cap() / 3);
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
            if (latency > 150) {
                bountyForMiner = (150 * bountyForMiner) / latency;
            }
            ISkaleToken(skaleTokenAddress).mint(from, uint(bountyForMiner));
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
