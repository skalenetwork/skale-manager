pragma solidity ^0.5.0;

import './Permissions.sol';


/**
 * @title ManagerData - Data contract for SkaleManager
 */
contract ManagerData is Permissions {
    
    // miners capitalization
    uint public minersCap;
    // start time
    uint32 public startTime;
    // time of current stage
    uint32 public stageTime;
    // amount of Nodes at current stage
    uint public stageNodes;

    //name of executor contract
    string executorName;

    /**
     * @dev constuctor in Permissions approach
     * @param newExecutorName - name of executor contract
     * @param newContractsAddress needed in Permissions constructor
     */
    constructor(string memory newExecutorName, address newContractsAddress) Permissions(newContractsAddress) public {
        startTime = uint32(block.timestamp);
        executorName = newExecutorName;
    }

    /**
     * @dev setMinersCap - sets miners capitalization
     */
    function setMinersCap(uint newMinersCap) public allow(executorName) {
        minersCap = newMinersCap;
    }

    /**
     * @dev setStageTimeAndStageNodes - sets new stage time and new amount of Nodes at this stage
     */
    function setStageTimeAndStageNodes(uint newStageNodes) public allow(executorName) {
        stageNodes = newStageNodes;
        stageTime = uint32(block.timestamp);
    }

}
