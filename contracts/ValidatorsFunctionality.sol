pragma solidity ^0.4.24;

import './GroupsFunctionality.sol';
//import './ValidatorsData.sol';
//import './NodesData.sol';

interface Constants {
    function deltaPeriod() external view returns (uint);
    function NUMBER_OF_VALIDATORS() external view returns (uint);
}

interface ValidatorsData {
    function addValidatedNode(bytes32 validatorIndex, bytes32 data) external;
    function addVerdict(bytes32 validatorIndex, uint32 downtime, uint32 latency) external;
    function removeValidatedNode(bytes32 validatorIndex, uint indexOfValidatedNode) external;
    function removeAllVerdicts(bytes32 validatorIndex) external;
    function getValidatedArray(bytes32 validatorIndex) external view returns (bytes32[]);
    function getLengthOfMetrics(bytes32 validatorIndex) external view returns (uint);
    function verdicts(bytes32 validatorIndex, uint numberOfVerdict, uint layer) external view returns (uint32);
}

interface NodesData {
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function getNodeIP(uint nodeIndex) external view returns (bytes4);
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint32);
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32);
    function getNumberOfNodes() external view returns (uint);
    function numberOfActiveNodes() external view returns (uint);
}


contract ValidatorsFunctionality is GroupsFunctionality {
    
    event ValidatorCreated(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfValidators,
        uint32 time,
        uint gasSpend                    
    );

    event ValidatorUpgraded(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfValidators,
        uint32 time,
        uint gasSpend
    );

    event ValidatorsArray(
        uint nodeIndex,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    event VerdictWasSent(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency,
        bool status,
        uint32 time,
        uint gasSpend
    );

    event MetricsWereCalculated(
        uint forNodeIndex,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint32 time,
        uint gasSpend
    );

    event PeriodsWereSet(
        uint rewardPeriod,
        uint deltaPeriod,
        uint32 time,
        uint gasSpend
    );

    constructor(string newExecutorName, string newDataName, address newContractsAddress) GroupsFunctionality(newExecutorName, newDataName, newContractsAddress) public {
        
    }

    function addValidator(uint nodeIndex) public allow(executorName) {
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked('Constants')));
        addGroup(groupIndex, Constants(constantsAddress).NUMBER_OF_VALIDATORS(), bytes32(nodeIndex));
        uint numberOfNodesInGroup = setValidators(groupIndex, nodeIndex);
        //require(1 != 1, "Break");
        emit ValidatorCreated(nodeIndex, groupIndex, numberOfNodesInGroup, uint32(block.timestamp), gasleft());
    }

    function upgradeValidator(uint nodeIndex) public allow(executorName) {
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        upgradeGroup(groupIndex, Constants(constantsAddress).NUMBER_OF_VALIDATORS(), bytes32(nodeIndex));
        uint numberOfNodesInGroup = setValidators(groupIndex, nodeIndex);
        emit ValidatorUpgraded(nodeIndex, groupIndex, numberOfNodesInGroup, uint32(block.timestamp), gasleft());
    }

    function sendVerdict(uint fromValidatorIndex, uint toNodeIndex, uint32 downtime, uint32 latency) public allow(executorName) {
        uint index;
        uint32 time;
        bytes32 validatorIndex = keccak256(abi.encodePacked(fromValidatorIndex));
        (index, time) = find(validatorIndex, toNodeIndex);
        require(time > 0, "Validated Node does not exist in ValidatorsArray");
        require(time <= block.timestamp, "The time has not come to send verdict");
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        ValidatorsData(dataAddress).removeValidatedNode(validatorIndex, index);
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        bool receiveVerdict = time + Constants(constantsAddress).deltaPeriod() > uint32(block.timestamp);
        if (receiveVerdict) {
            ValidatorsData(dataAddress).addVerdict(keccak256(abi.encodePacked(toNodeIndex)), downtime, latency);
        }
        emit VerdictWasSent(fromValidatorIndex, toNodeIndex, downtime, latency, receiveVerdict, uint32(block.timestamp), gasleft());
    }

    function calculateMetrics(uint nodeIndex) public allow(executorName) returns (uint32 averageDowntime, uint32 averageLatency) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        bytes32 validatorIndex = keccak256(abi.encodePacked(nodeIndex));
        uint lengthOfArray = ValidatorsData(dataAddress).getLengthOfMetrics(validatorIndex);
        uint32[] memory downtimeArray = new uint32[](lengthOfArray);
        uint32[] memory latencyArray = new uint32[](lengthOfArray);
        for (uint i = 0; i < lengthOfArray; i++) {
            downtimeArray[i] = ValidatorsData(dataAddress).verdicts(validatorIndex, i, 0);
            latencyArray[i] = ValidatorsData(dataAddress).verdicts(validatorIndex, i, 1);
        }
        if (lengthOfArray > 0) {
            quickSort(downtimeArray, 0, lengthOfArray - 1);
            quickSort(latencyArray, 0, lengthOfArray - 1);
            uint start = 0;
            uint finish = lengthOfArray - 1;
            uint numberOfNodes = GroupsData(dataAddress).getNumberOfNodesInGroup(validatorIndex);
            if (lengthOfArray > ((numberOfNodes * 2) / 3) && lengthOfArray > 2) {
                start = ((lengthOfArray - (numberOfNodes * 2) / 3) + (lengthOfArray - (numberOfNodes * 2) / 3) % 2) / 2;
                finish = (numberOfNodes * 2) / 3;
            }
            uint32 divisor = uint32(finish - start + 1);

            while (start <= finish) {
                averageDowntime += downtimeArray[start];
                averageLatency += latencyArray[start];
                start++;
            }
            ValidatorsData(dataAddress).removeAllVerdicts(validatorIndex);
            averageDowntime /= divisor;
            averageLatency /= divisor;
        }
    }

    function generateGroup(bytes32 groupIndex) internal allow(executorName) returns (uint[]) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(GroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");
        bytes32 groupData = GroupsData(dataAddress).getGroupData(groupIndex);
        uint hash = uint(keccak256(abi.encodePacked(uint(blockhash(block.number)), groupIndex)));
        uint numberOfNodes;
        uint finish;
        (numberOfNodes, finish) = setNumberOfNodesInGroup(groupIndex, groupData);
        uint indexOfNode;
        uint iterations;
        while (finish > 0 && iterations < 200) {
            indexOfNode = hash % numberOfNodes;
            if (comparator(groupIndex, indexOfNode)) {
                GroupsData(dataAddress).setException(groupIndex, indexOfNode);
                GroupsData(dataAddress).setNodeInGroup(groupIndex, indexOfNode);
                finish--;
            }
            hash = uint(keccak256(abi.encodePacked(hash, indexOfNode)));
            iterations++;
        }
        uint[] memory nodesInGroup = GroupsData(dataAddress).getNodesInGroup(groupIndex);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            GroupsData(dataAddress).removeExceptionNode(groupIndex, nodesInGroup[i]);
        }
        emit GroupGenerated(groupIndex, nodesInGroup, uint32(block.timestamp), gasleft());
        return nodesInGroup;
    }

    function setNumberOfNodesInGroup(bytes32 groupIndex, bytes32 groupData) internal view returns (uint numberOfNodes, uint finish) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked('NodesData')));
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        numberOfNodes = NodesData(nodesDataAddress).getNumberOfNodes();
        uint numberOfActiveNodes = NodesData(nodesDataAddress).numberOfActiveNodes();
        uint numberOfExceptionNodes = (NodesData(nodesDataAddress).isNodeActive(uint(groupData)) ? 1 : 0);
        uint recommendedNumberOfNodes = GroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
        finish = (recommendedNumberOfNodes > numberOfActiveNodes - numberOfExceptionNodes ? numberOfActiveNodes - numberOfExceptionNodes : recommendedNumberOfNodes);
    }

    function comparator(bytes32 groupIndex, uint indexOfNode) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked('NodesData')));
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        return NodesData(nodesDataAddress).isNodeActive(indexOfNode) && !GroupsData(dataAddress).isExceptionNode(groupIndex, indexOfNode);
    }

    function setValidators(bytes32 groupIndex, uint nodeIndex) internal returns (uint) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        GroupsData(dataAddress).setException(groupIndex, nodeIndex);
        uint[] memory indexOfNodesInGroup = generateGroup(groupIndex);
        bytes32 bytesParametersOfNodeIndex = getDataToBytes(nodeIndex);
        for (uint i = 0; i < indexOfNodesInGroup.length; i++) {
            bytes32 index = keccak256(abi.encodePacked(indexOfNodesInGroup[i]));
            ValidatorsData(dataAddress).addValidatedNode(index, bytesParametersOfNodeIndex);
        }
        emit ValidatorsArray(nodeIndex, groupIndex, indexOfNodesInGroup, uint32(block.timestamp), gasleft());
        return indexOfNodesInGroup.length;
    }

    function find(bytes32 validatorIndex, uint nodeIndex) internal view returns (uint index, uint32 time) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        bytes32[] memory validatedNodes = ValidatorsData(dataAddress).getValidatedArray(validatorIndex);
        uint possibleIndex;
        uint32 possibleTime;
        for (uint i = 0; i < validatedNodes.length; i++) {
            (possibleIndex, possibleTime) = getDataFromBytes(validatedNodes[i]);
            if (possibleIndex == nodeIndex && (time == 0 || possibleTime < time)) {
                index = i;
                time = possibleTime;
            }
        }
    }

    function quickSort(uint32[] memory array, uint left, uint right) internal view {
        uint leftIndex = left;
        uint rightIndex = right;
        uint32 middle = array[(right + left) / 2];
        while (leftIndex <= rightIndex) {
            while (array[leftIndex] < middle) {
                leftIndex++;
                }
            while (middle < array[rightIndex]) {
                rightIndex--;
                }
            if (leftIndex <= rightIndex) {
                (array[leftIndex], array[rightIndex]) = (array[rightIndex], array[leftIndex]);
                leftIndex++;
                rightIndex = (rightIndex > 0 ? rightIndex - 1 : 0);
            }
        }
        if (left < rightIndex) 
            quickSort(array, left, rightIndex);
        if (leftIndex < right) 
            quickSort(array, leftIndex, right);
    }

    function getDataFromBytes(bytes32 data) internal pure returns (uint index, uint32 time) {
        bytes memory tempBytes = new bytes(32);
        bytes14 bytesIndex;
        bytes14 bytesTime;
        assembly {
            mstore(add(tempBytes, 32), data)
            bytesIndex := mload(add(tempBytes, 32))
            bytesTime := mload(add(tempBytes, 46))
        }
        index = uint(bytesIndex);
        time = uint32(bytesTime);
    }

    function getDataToBytes(uint nodeIndex) internal view returns (bytes32 bytesParameters) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        //require(1 != 1, "Break");
        bytes memory tempData = new bytes(32);
        bytes14 bytesOfIndex = bytes14(nodeIndex);
        ////require(1 != 1, "Break");
        bytes14 bytesOfTime = bytes14(NodesData(nodesDataAddress).getNodeNextRewardDate(nodeIndex) - Constants(constantsAddress).deltaPeriod());
        //require(1 != 1, "Break");
        bytes4 ip = NodesData(nodesDataAddress).getNodeIP(nodeIndex);
        //require(1 != 1, "Break");
        assembly {
            mstore(add(tempData, 32), bytesOfIndex)
            mstore(add(tempData, 46), bytesOfTime)
            mstore(add(tempData, 60), ip)
            bytesParameters := mload(add(tempData, 32))
        }
    }
}
