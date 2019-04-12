pragma solidity ^0.4.24;

import './Permissions.sol';


contract ManagerData is Permissions {
    
    uint public minersCap;
    uint32 public startTime;
    uint32 public stageTime;
    uint public stageNodes;

    string executorName;

    constructor(string newExecutorName, address newContractsAddress) Permissions(newContractsAddress) public {
        startTime = uint32(block.timestamp);
        executorName = newExecutorName;
    }

    function setMinersCap(uint newMinersCap) public allow(executorName) {
        minersCap = newMinersCap;
    }

    function setStageTimeAndStageNodes(uint newStageNodes) public allow(executorName) {
        stageNodes = newStageNodes;
        stageTime = uint32(block.timestamp);
    }

}
