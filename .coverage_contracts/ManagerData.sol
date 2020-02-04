/*
    ManagerData.sol - SKALE Manager
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
import "./interfaces/IManagerData.sol";


/**
 * @title ManagerData - Data contract for SkaleManager
 */
contract ManagerData is IManagerData, Permissions {
function coverage_0x08d9a91d(bytes32 c__0x08d9a91d) public pure {}


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
    constructor(string memory newExecutorName, address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x08d9a91d(0xc6defa78baa3e0ea342a5e0df19f26dab627e3ccd1ecf29ed05e7b72e9e747f6); /* function */ 

coverage_0x08d9a91d(0x7355adfddfd0d657727b792002703adb7efb20e7cd80f0c7132de3e5c00548b6); /* line */ 
        coverage_0x08d9a91d(0x981cef256bf934e674d531e4d7c1e7344b1a07d2c437851e6a4becdf1f155e34); /* statement */ 
startTime = uint32(block.timestamp);
coverage_0x08d9a91d(0xdd2485bef2c4fb0f899289a8befffe44e5873af026121d5236082c9327b8645b); /* line */ 
        coverage_0x08d9a91d(0x5d80721d9e0d036d5ba370bbff3213e03cfa3e3ee2add56a0362f5ccadd97fd0); /* statement */ 
executorName = newExecutorName;
    }

    /**
     * @dev setMinersCap - sets miners capitalization
     */
    function setMinersCap(uint newMinersCap) external allow(executorName) {coverage_0x08d9a91d(0x6f26de608d46253db3aa039c5c601899af8c94e68f8178149f4d04142353554b); /* function */ 

coverage_0x08d9a91d(0x2f0677df53e42515cc5c09a60a442a013311f0bcd3b3c165c130392f69201de9); /* line */ 
        coverage_0x08d9a91d(0xf00f6a1e54e0e2a80898d0a6a41d01ce28048c9840dc3f7f17e396ffa930ce98); /* statement */ 
minersCap = newMinersCap;
    }

    /**
     * @dev setStageTimeAndStageNodes - sets new stage time and new amount of Nodes at this stage
     */
    function setStageTimeAndStageNodes(uint newStageNodes) external allow(executorName) {coverage_0x08d9a91d(0x00aba4730fdda884fe109e501a4a9e5d07136b580ac279c18b70db1196af9057); /* function */ 

coverage_0x08d9a91d(0xab8d83770a1b09e6aa601cf8d7b8069d77c3331f9eaf6ecc7a02b7ec050a053c); /* line */ 
        coverage_0x08d9a91d(0xd1abe6242b69b09defe29de260f60b4447034742ddf649f5d255bdaa854423a2); /* statement */ 
stageNodes = newStageNodes;
coverage_0x08d9a91d(0x9ad3e3f0bcbb3560ecf132e2cc655b337966b24e3a535b72864af44dc7ce335c); /* line */ 
        coverage_0x08d9a91d(0xd8416dea4595d93280618225c9ed1f9f0c24fcd47207d4ba4a6816956009c6f2); /* statement */ 
stageTime = uint32(block.timestamp);
    }

}
