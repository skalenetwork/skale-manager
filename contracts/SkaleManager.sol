pragma solidity ^0.5.0;

import './Permissions.sol';
//import './ValidatorsFunctionality.sol';
//import './NodesFunctionality.sol';
//import './SchainsFunctionality.sol';
//import './SkaleToken.sol';
//import './ManagerData.sol';

interface SkaleToken {
    function transfer1(address to, uint value) external returns (bool success);
    function mint(address to, uint value) external returns (bool success);
    function cap() external view returns (uint);
}

interface Constants {
    function rewardPeriod() external view returns (uint);
    function deltaPeriod() external view returns (uint);
    function SIX_YEARS() external view returns (uint32);
    function SECONDS_TO_DAY() external view returns (uint32);
}

interface NodesData {
    function changeNodeLastRewardDate(uint nodeIndex) external;
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function isNodeLeaving(uint nodeIndex) external view returns (bool);
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32);
    function numberOfActiveNodes() external view returns (uint);
    function numberOfLeavingNodes() external view returns (uint);
}

interface NodesFunctionality {
    function createNode(address from, uint value, bytes calldata data) external returns (uint);
    function initWithdrawDeposit(address from, uint nodeIndex) external;
    function completeWithdrawDeposit(address from, uint nodeIndex) external returns (uint);
    function removeNode(address from, uint nodeIndex) external;
}

interface ValidatorsFunctionality {
    function addValidator(uint nodeIndex) external;
    function upgradeValidator(uint nodeIndex) external;
    function sendVerdict(uint fromValidatorIndex, uint toNodeIndex, uint32 downtime, uint32 latency) external;
    function calculateMetrics(uint nodeIndex) external returns (uint32, uint32);
}

interface SchainsFunctionality {
    function addSchain(address from, uint value, bytes calldata data) external;
    function deleteSchain(address from, bytes32 schainId) external;
}

interface ManagerData {
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
            uint nodeIndex = NodesFunctionality(nodesFunctionalityAddress).createNode(from, value, data);
            ValidatorsFunctionality(validatorsFunctionalityAddress).addValidator(nodeIndex);
        } else if (operationType == TransactionOperation.CreateSchain) {
            address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
            //require(1 != 1, "Break");
            SchainsFunctionality(schainsFunctionalityAddress).addSchain(from, value, data);
        }
    }

    function initWithdrawDeposit(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        NodesFunctionality(nodesFunctionalityAddress).initWithdrawDeposit(msg.sender, nodeIndex);
    }

    function completeWithdrawdeposit(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        uint amount = NodesFunctionality(nodesFunctionalityAddress).completeWithdrawDeposit(msg.sender, nodeIndex);
        address skaleTokenAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleToken")));
        SkaleToken(skaleTokenAddress).transfer1(msg.sender, amount);
    }

    function deleteNode(uint nodeIndex) public {
        address nodesFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesFunctionality")));
        NodesFunctionality(nodesFunctionalityAddress).removeNode(msg.sender, nodeIndex);
    }

    function sendVerdict(uint fromValidatorIndex, uint toNodeIndex, uint32 downtime, uint32 latency) public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(NodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");
        address validatorsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked('ValidatorsFunctionality')));
        ValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(fromValidatorIndex, toNodeIndex, downtime, latency);
    }

    function getBounty(uint nodeIndex) public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(NodesData(nodesDataAddress).isNodeExist(msg.sender, nodeIndex), "Node does not exist for Message sender");
        require(NodesData(nodesDataAddress).isNodeActive(nodeIndex) || NodesData(nodesDataAddress).isNodeLeaving(nodeIndex), "Node is not Active and is not Leaving");
        uint32 averageDowntime;
        uint32 averageLatency;
        address validatorsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
        (averageDowntime, averageLatency) = ValidatorsFunctionality(validatorsFunctionalityAddress).calculateMetrics(nodeIndex);
        uint bounty = manageBounty(msg.sender, nodeIndex, averageDowntime, averageLatency, nodesDataAddress);
        NodesData(nodesDataAddress).changeNodeLastRewardDate(nodeIndex);
        ValidatorsFunctionality(validatorsFunctionalityAddress).upgradeValidator(nodeIndex);
        emit BountyGot(nodeIndex, msg.sender, averageDowntime, averageLatency, bounty, uint32(block.timestamp), gasleft());
    }

    function manageBounty(address from, uint nodeIndex, uint32 downtime, uint32 latency, address nodesDataAddress) internal returns (uint) {
        
        uint commonBounty;
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint diffTime = NodesData(nodesDataAddress).getNodeLastRewardDate(nodeIndex) + Constants(constantsAddress).rewardPeriod() + Constants(constantsAddress).deltaPeriod();
        address managerDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("ManagerData")));
        address skaleTokenAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleToken")));
        if (ManagerData(managerDataAddress).minersCap() == 0) {
            ManagerData(managerDataAddress).setMinersCap(SkaleToken(skaleTokenAddress).cap() / 3);
        }
        uint step = ((now - ManagerData(managerDataAddress).startTime()) / Constants(constantsAddress).SIX_YEARS()) + 1;
        if (ManagerData(managerDataAddress).stageTime() + Constants(constantsAddress).rewardPeriod() < now) {
            ManagerData(managerDataAddress).setStageTimeAndStageNodes(NodesData(nodesDataAddress).numberOfActiveNodes() + NodesData(nodesDataAddress).numberOfLeavingNodes());
        }
        commonBounty = ManagerData(managerDataAddress).minersCap() / ((2 ** step) * (Constants(constantsAddress).SIX_YEARS() / Constants(constantsAddress).rewardPeriod()) * ManagerData(managerDataAddress).stageNodes());
        if (now > diffTime) {
            diffTime = now - diffTime;
        } else {
            diffTime = 0;
        }
        int bountyForMiner = int(commonBounty);
        if (downtime > 200) {
            bountyForMiner -= int(((downtime + diffTime) * commonBounty) / (Constants(constantsAddress).SECONDS_TO_DAY() / 4));
        }

        if (bountyForMiner > 0) {
            if (latency > 150) {
                bountyForMiner = (150 * bountyForMiner) / latency;
            }
            SkaleToken(skaleTokenAddress).mint(from, uint(bountyForMiner));
        } else {
            //Need to add penalty
            bountyForMiner = 0;
        }
        return uint(bountyForMiner);
    }

    function deleteSchain(string memory name) public {
        address schainsFunctionalityAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
        SchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, keccak256(abi.encodePacked(name)));
    }

    function fallbackOperationTypeConvert(bytes memory data) internal pure returns (TransactionOperation) {
        bytes1 operationType;
        assembly {
            operationType := mload(add(data, 0x20))
        }
        require(operationType == bytes1(uint8(1)) || operationType == bytes1(uint8(16)) || operationType == bytes1(uint8(17)), "Operation type is not identified");
        if (operationType == bytes1(uint8(1))) {
            return TransactionOperation.CreateNode;
        } else if (operationType == bytes1(uint8(16))) {
            return TransactionOperation.CreateSchain;
        }
    }

}
