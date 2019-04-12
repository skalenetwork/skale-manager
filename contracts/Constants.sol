pragma solidity ^0.4.24;

//import './Ownable.sol';
import './Permissions.sol';


contract Constants is Permissions {

    uint public NODE_DEPOSIT = 100000000000000000000;
    uint public TINY_DIVISOR = 128;
    uint public SMALL_DIVISOR = 8;
    uint public MEDIUM_DIVISOR = 1;
    uint public NUMBER_OF_NODES_FOR_SCHAIN = 16;
    uint public NUMBER_OF_NODES_FOR_TEST_SCHAIN = 2;
    uint public FRACTIONAL_FACTOR = 128;
    uint public FULL_FACTOR = 17;
    uint32 public SECONDS_TO_DAY = 86400;
    uint32 public SECONDS_TO_MONTH = 2592000;
    uint32 public SECONDS_TO_YEAR = 31622400;
    uint32 public SIX_YEARS = 186624000;
    uint public NUMBER_OF_VALIDATORS = 21;
    uint32 public rewardPeriod = 600; // Test parameters
    uint32 public deltaPeriod = 240;  //
    uint public lastTimeUnderloaded = 0;
    uint public lastTimeOverloaded = 0;
    
    //Need to add minimal allowed parameters for verdicts

    constructor(address contractsAddress) Permissions(contractsAddress) public {
        /*NODE_DEPOSIT = 100000000000000000000;
        TINY_DIVISOR = 128;
        SMALL_DIVISOR = 8;
        MEDIUM_DIVISOR = 1;
        NUMBER_OF_NODES_FOR_SCHAIN = 16;
        NUMBER_OF_NODES_FOR_TEST_SCHAIN = 2;
        FULL_FACTOR = 17;
        FRACTIONAL_FACTOR = 128;
        SECONDS_TO_DAY = 86400;
        SECONDS_TO_MONTH = 2592000;
        SECONDS_TO_YEAR = 31104000;
        SIX_YEARS = 186624000;
        NUMBER_OF_VALIDATORS = 21;
        rewardPeriod = 600;
        deltaPeriod = 240;*/
    }

    function setPeriods(uint32 newRewardPeriod, uint32 newDeltaPeriod) public onlyOwner {
        rewardPeriod = newRewardPeriod;
        deltaPeriod = newDeltaPeriod;
    }

    function setLastTimeUnderloaded() public allow("NodesFunctionality") {
        lastTimeUnderloaded = now;
    }

    function setLastTimeOverloaded() public allow("SchainsFunctionality") {
        lastTimeOverloaded = now;
    }
}
