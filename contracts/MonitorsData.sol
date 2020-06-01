// SPDX-License-Identifier: AGPL-3.0-only

/*
    MonitorsData.sol - SKALE Manager
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
`
    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./GroupsData.sol";
import "./Nodes.sol";


contract MonitorsData is GroupsData {

    struct Verdict {
        uint toNodeIndex;
        uint32 downtime;
        uint32 latency;
    }

    struct CheckedNode {
        uint nodeIndex;
        uint32 time;
    }

    struct CheckedNodeWithIp {
        uint nodeIndex;
        uint32 time;
        bytes4 ip;
    }

    mapping (bytes32 => CheckedNode[]) public checkedNodes;
    mapping (bytes32 => uint[][]) public verdicts;

    mapping (bytes32 => uint) public lastVerdictBlocks;
    mapping (bytes32 => uint) public lastBountyBlocks;

    function addVerdict(bytes32 monitorIndex, uint32 downtime, uint32 latency) external allow(_executorName) {
        verdicts[monitorIndex].push([uint(downtime), uint(latency)]);
        lastVerdictBlocks[monitorIndex] = block.number;
    }

    function removeCheckedNode(bytes32 monitorIndex, uint indexOfCheckedNode) external allow(_executorName) {
        if (indexOfCheckedNode != checkedNodes[monitorIndex].length - 1) {
            checkedNodes[monitorIndex][indexOfCheckedNode] =
                checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
        }
        delete checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
        checkedNodes[monitorIndex].pop();
    }

    function removeAllCheckedNodes(bytes32 monitorIndex) external allow(_executorName) {
        delete checkedNodes[monitorIndex];
    }

    function removeAllVerdicts(bytes32 monitorIndex) external allow(_executorName) {
        lastBountyBlocks[monitorIndex] = block.number;
        while (verdicts[monitorIndex].length > 0) {
            verdicts[monitorIndex].pop();
        }
    }

    function removeAfterMergingMonitors() external {
        addCheckedNode(0, CheckedNode(0, 0));
        // TODO: This function is a workaround to fix "InternalCompilerError: Structs in calldata not supported." error
        // TODO: We will remove it after merging MonitorsFunctionality and MonitorsData
    }

    function getCheckedArray(bytes32 monitorIndex) external view
    returns (CheckedNodeWithIp[] memory checkedNodesWithIp)
    {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        checkedNodesWithIp = new CheckedNodeWithIp[](checkedNodes[monitorIndex].length);
        for (uint i = 0; i < checkedNodes[monitorIndex].length; ++i) {
            checkedNodesWithIp[i].nodeIndex = checkedNodes[monitorIndex][i].nodeIndex;
            checkedNodesWithIp[i].time = checkedNodes[monitorIndex][i].time;
            checkedNodesWithIp[i].ip = nodes.getNodeIP(checkedNodes[monitorIndex][i].nodeIndex);
        }
    }

    function getCheckedArrayLength(bytes32 monitorIndex) external view returns (uint) {
        return checkedNodes[monitorIndex].length;
    }

    function getLengthOfMetrics(bytes32 monitorIndex) external view returns (uint) {
        return verdicts[monitorIndex].length;
    }

    function getLastReceivedVerdictBlock(uint nodeIndex) external view returns (uint) {
        return lastVerdictBlocks[keccak256(abi.encodePacked(nodeIndex))];
    }

    function getLastBountyBlock(uint nodeIndex) external view returns (uint) {
        return lastBountyBlocks[keccak256(abi.encodePacked(nodeIndex))];
    }

    function initialize(address newContractsAddress) public override initializer {
        GroupsData.initialize("MonitorsFunctionality", newContractsAddress);
    }

    /**
     *  Add checked node or update existing one if it is already exits
     */
    function addCheckedNode(bytes32 monitorIndex, CheckedNode memory checkedNode) public allow(_executorName) {
        for (uint i = 0; i < checkedNodes[monitorIndex].length; ++i) {
            if (checkedNodes[monitorIndex][i].nodeIndex == checkedNode.nodeIndex) {
                checkedNodes[monitorIndex][i] = checkedNode;
                return;
            }
        }
        checkedNodes[monitorIndex].push(checkedNode);
    }
}
