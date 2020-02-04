/*
    ConstantsHolder.sol - SKALE Manager
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
import "./interfaces/IConstants.sol";


/**
 * @title Contains constants and common variables for Skale Manager system
 * @author Artem Payvin
 */
contract ConstantsHolder is IConstants, Permissions {
function coverage_0x27a7fff7(bytes32 c__0x27a7fff7) public pure {}


    // initial price for creating Node (100 SKL)
    uint public constant NODE_DEPOSIT = 100 * 1e18;

    // part of Node for Tiny Skale-chain (1/128 of Node)
    uint8 public constant TINY_DIVISOR = 128;

    // part of Node for Small Skale-chain (1/8 of Node)
    uint8 public constant SMALL_DIVISOR = 8;

    // part of Node for Medium Skale-chain (full Node)
    uint8 public constant MEDIUM_DIVISOR = 1;

    // part of Node for Medium Test Skale-chain (1/4 of Node)
    uint8 public constant MEDIUM_TEST_DIVISOR = 4;

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
    uint public constant NUMBER_OF_VALIDATORS = 24;

    // Reward period - 30 days (each 30 days Node would be granted for bounty)
    uint32 public rewardPeriod = 3600; // Test parameters

    // Allowable latency - 150000 ms by default
    uint32 public allowableLatency = 150000; // Test parameters

    /**
     * Delta period - 1 hour (1 hour before Reward period became Validators need
     * to send Verdicts and 1 hour after Reward period became Node need to come
     * and get Bounty)
     */
    uint32 public deltaPeriod = 300;  // Test parameters

    /**
     * Check time - 2 minutes (every 2 minutes validators should check metrics
     * from validated nodes)
     */
    uint8 public checkTime = 120; // Test parameters

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
    constructor(address contractsAddress) Permissions(contractsAddress) public {coverage_0x27a7fff7(0xac7dcbd1dc6771dfd7e1bb35716490dfdbdb47ed487e24a288bc0e25af9b1e06); /* function */ 


    }

    /**
     * Set reward and delta periods to new one, run only by owner. This function
     * only for tests.
     * @param newRewardPeriod - new Reward period
     * @param newDeltaPeriod - new Delta period
     */
    function setPeriods(uint32 newRewardPeriod, uint32 newDeltaPeriod) external onlyOwner {coverage_0x27a7fff7(0x77770854c9422f5aea6fb3db3a8a230f17b2696dd7a299f6e3378f96a332b54a); /* function */ 

coverage_0x27a7fff7(0x3b9c90ce9628fc2d991a2b5f54bca67471959d38eb9d916d6c36655428f6a780); /* line */ 
        coverage_0x27a7fff7(0x0f39fc766c28465cb746ffb183bcabf288dfc4235bd13afb4c4cf22e961617c0); /* statement */ 
rewardPeriod = newRewardPeriod;
coverage_0x27a7fff7(0x074a49ecc07f56340c36f0ac8d1551f830ab39013c41acc689929228344968ce); /* line */ 
        coverage_0x27a7fff7(0x761a923a3b18c77ee0bb4f2204a1ec87a4881191a3d3ac15fc097e30234bb8c3); /* statement */ 
deltaPeriod = newDeltaPeriod;
    }

    /**
     * Set new check time. This function only for tests.
     * @param newCheckTime - new check time
     */
    function setCheckTime(uint8 newCheckTime) external onlyOwner {coverage_0x27a7fff7(0xb033377c2315dd1f2002bfd99af2efc904f78b821f49650067d9f17249a5d3ec); /* function */ 

coverage_0x27a7fff7(0x59751c0283f34d7dfb0301f1ce12bdd6a9819efeff7f5c816dc585bbb5b17fd8); /* line */ 
        coverage_0x27a7fff7(0x347b83adea0dd4a1f240dd0456eba59a10928c210e8caca113325b11d85f1e21); /* statement */ 
checkTime = newCheckTime;
    }

    /**
     * Set time if system underloaded, run only by NodesFunctionality contract
     */
    function setLastTimeUnderloaded() external allow("NodesFunctionality") {coverage_0x27a7fff7(0x472fb42a7b90fe5007255aa0cbe583625201baac543aa2280491c9e132e76b66); /* function */ 

coverage_0x27a7fff7(0x0217bf24c1b6d56db10f472b8e5c531ba531a57af258d35e5d599d8cbff002cc); /* line */ 
        coverage_0x27a7fff7(0xae69436cba538754516622b7b10641c83fcc648a52bd75a6aef3200ea0c96ab3); /* statement */ 
lastTimeUnderloaded = now;
    }

    /**
     * Set time if system iverloaded, run only by SchainsFunctionality contract
     */
    function setLastTimeOverloaded() external allow("SchainsFunctionality") {coverage_0x27a7fff7(0x5c6e059e1ce54c194cba94f88eb255c4449f90ef773f50de60b040ce87676d07); /* function */ 

coverage_0x27a7fff7(0x204436aab4292d4b5a33c68cc81cbfe596e484fed28343c4c8a3e2a878755dd6); /* line */ 
        coverage_0x27a7fff7(0x65ee667c9699464a38df1c608c05a7d87baf306362c6498417883496a30780af); /* statement */ 
lastTimeOverloaded = now;
    }

    /**
     * Set latency new one in ms, run only by owner. This function
     * only for tests.
     * @param newAllowableLatency - new Allowable Latency
     */
    function setLatency(uint32 newAllowableLatency) external onlyOwner {coverage_0x27a7fff7(0x90a42193498219369d51dd659d880964e92ea2b1ea713025d4e1bb1609f0e270); /* function */ 

coverage_0x27a7fff7(0x4a9e2c8c88f24eafecf6dda1562941d0e2e39a247d0ddd74ede12c1a6343b283); /* line */ 
        coverage_0x27a7fff7(0x029a5b1cb48999f5d1b39a6762f40f5997876ac00acd40179e63da2b3467f12b); /* statement */ 
allowableLatency = newAllowableLatency;
    }
}
