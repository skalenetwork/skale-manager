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
pragma solidity 0.8.17;

import { Permissions } from "../Permissions.sol";
import { INodesMock } from "./interfaces/INodesMock.sol";


contract NodesMock is Permissions, INodesMock {

    uint256 public nodesCount = 0;
    uint256 public nodesLeft = 0;
    //     nodeId => timestamp
    mapping (uint256 => uint256) public lastRewardDate;
    //     nodeId => left
    mapping (uint256 => bool) public nodeLeft;
    //     nodeId => validatorId
    mapping (uint256 => uint256) public owner;

    constructor (address contractManagerAddress) {
        Permissions.initialize(contractManagerAddress);
    }

    function registerNodes(uint256 amount, uint256 validatorId) external override {
        for (uint256 nodeId = nodesCount; nodeId < nodesCount + amount; ++nodeId) {
            lastRewardDate[nodeId] = block.timestamp;
            owner[nodeId] = validatorId;
        }
        nodesCount += amount;
    }
    function removeNode(uint256 nodeId) external override {
        ++nodesLeft;
        nodeLeft[nodeId] = true;
    }
    function changeNodeLastRewardDate(uint256 nodeId) external override {
        lastRewardDate[nodeId] = block.timestamp;
    }
    function getNodeLastRewardDate(
        uint256 nodeIndex
    )
        external
        view
        override
        returns (uint256 timestamp)
    {
        require(nodeIndex < nodesCount, "Node does not exist");
        return lastRewardDate[nodeIndex];
    }
    function isNodeLeft(uint256 nodeId) external view override returns (bool left) {
        return nodeLeft[nodeId];
    }
    function getNumberOnlineNodes() external view override returns (uint256 amount) {
        return nodesCount - nodesLeft;
    }
    function getValidatorId(uint256 nodeId) external view override returns (uint256 id) {
        return owner[nodeId];
    }
    function checkPossibilityToMaintainNode(uint256 /* validatorId */, uint256 /* nodeIndex */)
        external
        pure
        override
        returns (bool possible)
    {
        return true;
    }
}
