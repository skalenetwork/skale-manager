pragma solidity ^0.5.0;

import "./Permissions.sol";


/**
 * @title Contains constants and common variables for Skale Manager system
 * @author Artem Payvin
 */
contract ConstantsHolder is Permissions {

    // initial price for creating Node (100 SKL)
    uint public constant NODE_DEPOSIT = 100000000000000000000;

    // part of Node for Tiny Skale-chain (1/128 of Node)
    uint public constant TINY_DIVISOR = 128;

    // part of Node for Small Skale-chain (1/8 of Node)
    uint public constant SMALL_DIVISOR = 8;

    // part of Node for Medium Skale-chain (full Node)
    uint public constant MEDIUM_DIVISOR = 1;

    // part of Node for Medium Test Skale-chain (1/4 of Node)
    uint public constant MEDIUM_TEST_DIVISOR = 4;

    // typically number of Nodes for Skale-chain (16 Nodes)
    uint public constant NUMBER_OF_NODES_FOR_SCHAIN = 16;

    // number of Nodes for Test Skale-chain (2 Nodes)
    uint public constant NUMBER_OF_NODES_FOR_TEST_SCHAIN = 2;

    // number of Nodes for Test Skale-chain (4 Nodes)
    uint public constant NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN = 4;

    // 'Fractional' Part of ratio for create Fractional or Full Node
    uint public constant FRACTIONAL_FACTOR = 128;

    // 'Full' part of ratio for create Fractional or Full Node
    uint public constant FULL_FACTOR = 17;

    // number of second in one day
    uint32 public constant SECONDS_TO_DAY = 86400;

    // number of seconds in one month
    uint32 public constant SECONDS_TO_MONTH = 2592000;

    // number of seconds in one year
    uint32 public constant SECONDS_TO_YEAR = 31622400;

    // number of seconds in six years
    uint32 public constant SIX_YEARS = 186624000;

    // initial number of validators
    // uint public constant NUMBER_OF_VALIDATORS = 24;

    // Reward period - 30 days (each 30 days Node would be granted for bounty)
    uint32 public rewardPeriod = 3600; // Test parameters

    /**
     * Delta period - 1 hour (1 hour before Reward period became Validators need
     * to send Verdicts and 1 hour after Reward period became Node need to come
     * and get Bounty)
     */
    uint32 public deltaPeriod = 300;  // Test parameters

    /**
     * Last time when system was underloaded
     * (allocations on Skale-chain / allocations on Nodes < 75%)
     */
    uint public lastTimeUnderloaded = 0;

    /**
     * Last time when system was overloaded
     * (allocations on Skale-chain / allocations on Nodes > 85%)
     */
    uint public lastTimeOverloaded = 0;

    //Need to add minimal allowed parameters for verdicts

    /**
     * @dev constructor in Permissions approach
     * @param contractsAddress needed in Permissions constructor
     */
    constructor(address contractsAddress) Permissions(contractsAddress) public {

    }

    /**
     * Set reward and delta periods to new one, run only by owner. This function
     * only for tests.
     * @param newRewardPeriod - new Reward period
     * @param newDeltaPeriod - new Delta period
     */
    function setPeriods(uint32 newRewardPeriod, uint32 newDeltaPeriod) public onlyOwner {
        rewardPeriod = newRewardPeriod;
        deltaPeriod = newDeltaPeriod;
    }

    /**
     * Set time if system underloaded, run only by NodesFunctionality contract
     */
    function setLastTimeUnderloaded() public allow("NodesFunctionality") {
        lastTimeUnderloaded = now;
    }

    /**
     * Set time if system iverloaded, run only by SchainsFunctionality contract
     */
    function setLastTimeOverloaded() public allow("SchainsFunctionality") {
        lastTimeOverloaded = now;
    }
}
