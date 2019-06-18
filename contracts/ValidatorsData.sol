pragma solidity ^0.5.0;

import './GroupsData.sol';


contract ValidatorsData is GroupsData {


    struct Metrics {
        uint32 downtime;
        uint32 latency;
    }

    struct Validator {
        uint nodeIndex;
        bytes32[] validatedNodes;
        Metrics[] verdicts;
    }

    mapping (bytes32 => bytes32[]) public validatedNodes;
    //mapping (bytes32 => Metrics[]) public verdicts;
    mapping (bytes32 => uint32[][]) public verdicts;

    constructor(string memory newExecutorName, address newContractsAddress) GroupsData(newExecutorName, newContractsAddress) public {
    
    }

    function addValidatedNode(bytes32 validatorIndex, bytes32 data) public allow(executorName) {
        validatedNodes[validatorIndex].push(data);
    }

    function addVerdict(bytes32 validatorIndex, uint32 downtime, uint32 latency) public allow(executorName) {
        verdicts[validatorIndex].push([downtime, latency]);
    }

    function removeValidatedNode(bytes32 validatorIndex, uint indexOfValidatedNode) public allow(executorName) {
        if (indexOfValidatedNode != validatedNodes[validatorIndex].length - 1) {
            validatedNodes[validatorIndex][indexOfValidatedNode] = validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
        }
        delete validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
        validatedNodes[validatorIndex].length--;
    }

    function removeAllVerdicts(bytes32 validatorIndex) public allow(executorName) {
        verdicts[validatorIndex].length = 0;
    }

    function getValidatedArray(bytes32 validatorIndex) public view returns (bytes32[] memory) {
        return validatedNodes[validatorIndex];
    }

    function getLengthOfMetrics(bytes32 validatorIndex) public view returns (uint) {
        return verdicts[validatorIndex].length;
    }
}
