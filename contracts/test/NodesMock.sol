// SPDX-License-Identifier: AGPL-3.0-only

/*
    NodesMock.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Dmytro Stebaiev

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

pragma solidity 0.6.10;

contract NodesMock {
    uint public nodesCount = 0;
    
    function registerNodes(uint amount) external {
        nodesCount += amount;
    }
    function getNodeLastRewardDate(uint /* nodeIndex */) external pure returns (uint) {
        revert("getNodeLastRewardDate is not implemented");
    }
    function isNodeLeft(uint /* nodeIndex */) external pure returns (bool) {
        return false;
    }
    function getNumberOnlineNodes() external view returns (uint) {
        return nodesCount;
    }
    function checkPossibilityToMaintainNode(uint /* validatorId */, uint /* nodeIndex */) external pure returns (bool) {
        return true;
    }
    function getValidatorId(uint /* nodeIndex */) external pure returns (uint) {
        return 1;
    }
}