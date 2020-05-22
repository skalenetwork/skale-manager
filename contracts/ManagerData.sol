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

pragma solidity 0.6.6;

import "./Permissions.sol";
import "./interfaces/IManagerData.sol";


/**
 * @title ManagerData - Data contract for SkaleManager
 */
contract ManagerData is IManagerData, Permissions {

    // miners capitalization
    uint public override minersCap;
    // start time
    uint32 public override startTime;
    // time of current stage
    uint32 public override stageTime;
    // amount of Nodes at current stage
    uint public override stageNodes;

    //name of executor contract
    string private _executorName;

    mapping (uint => uint[]) public bountyBlocks;

    function setBountyBlock(uint nodeIndex) external override allow(_executorName) {
        bountyBlocks[nodeIndex].push(block.number);
    }

    /**
     * @dev setMinersCap - sets miners capitalization
     */
    function setMinersCap(uint newMinersCap) external override allow(_executorName) {
        minersCap = newMinersCap;
    }

    /**
     * @dev setStageTimeAndStageNodes - sets new stage time and new amount of Nodes at this stage
     */
    function setStageTimeAndStageNodes(uint newStageNodes) external override allow(_executorName) {
        stageNodes = newStageNodes;
        stageTime = uint32(block.timestamp);
    }

    function getBountyBlocks(uint nodeIndex) external override view returns (uint[] memory) {
        return bountyBlocks[nodeIndex];
    }

    /**
     * @dev constuctor in Permissions approach
     * @param newContractsAddress needed in Permissions constructor
     */
    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
        startTime = uint32(block.timestamp);
        _executorName = "SkaleManager";
    }
}
