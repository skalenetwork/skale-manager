// SPDX-License-Identifier: AGPL-3.0-only

/*
    Monitors.sol - SKALE Manager
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
pragma experimental ABIEncoderV2;

import "./Groups.sol";
import "./ConstantsHolder.sol";
import "./Nodes.sol";


contract Monitors is Groups {

    using StringUtils for string;

    struct Verdict {
        uint toNodeIndex;
        uint32 downtime;
        uint32 latency;
    }

    mapping (bytes32 => bytes32[]) public checkedNodes;
    mapping (bytes32 => uint[][]) public verdicts;

    mapping (bytes32 => uint) public lastVerdictBlocks;
    mapping (bytes32 => uint) public lastBountyBlocks;


    event MonitorCreated(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfMonitors,
        uint32 time,
        uint gasSpend
    );

    event MonitorUpgraded(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfMonitors,
        uint32 time,
        uint gasSpend
    );

    event MonitorsArray(
        uint nodeIndex,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    event VerdictWasSent(
        uint indexed fromMonitorIndex,
        uint indexed toNodeIndex,
        uint32 downtime,
        uint32 latency,
        bool status,
        uint previousBlockEvent,
        uint32 time,
        uint gasSpend
    );

    event MetricsWereCalculated(
        uint forNodeIndex,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint32 time,
        uint gasSpend
    );

    event PeriodsWereSet(
        uint rewardPeriod,
        uint deltaPeriod,
        uint32 time,
        uint gasSpend
    );


    event MonitorRotated(
        bytes32 groupIndex,
        uint newNode
    );

    /**
     * addMonitor - setup monitors of node
     */
    function addMonitor(uint nodeIndex) external allow(_executorName) {
        ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        uint possibleNumberOfNodes = constantsHolder.NUMBER_OF_MONITORS();
        createGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
        uint numberOfNodesInGroup = _setMonitors(groupIndex, nodeIndex);
        ISkaleDKG(_contractManager.getContract("SkaleDKG")).openChannel(groupIndex);

        emit MonitorCreated(
            nodeIndex,
            groupIndex,
            numberOfNodesInGroup,
            uint32(block.timestamp), gasleft()
        );
    }

    function upgradeMonitor(uint nodeIndex) external allow(_executorName) {
        ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        uint possibleNumberOfNodes = constantsHolder.NUMBER_OF_MONITORS();
        _upgradeGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
        uint numberOfNodesInGroup = _setMonitors(groupIndex, nodeIndex);

        ISkaleDKG skaleDKG = ISkaleDKG(_contractManager.getContract("SkaleDKG"));
        if (skaleDKG.isChannelOpened(groupIndex)) {
            skaleDKG.deleteChannel(groupIndex);
        }
        skaleDKG.openChannel(groupIndex);

        emit MonitorUpgraded(
            nodeIndex,
            groupIndex,
            numberOfNodesInGroup,
            uint32(block.timestamp), gasleft()
        );
    }

    function deleteMonitor(uint nodeIndex) external allow(_executorName) {
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        while (verdicts[keccak256(abi.encodePacked(nodeIndex))].length > 0) {
            verdicts[keccak256(abi.encodePacked(nodeIndex))].pop();
        }
        delete checkedNodes[groupIndex];
        uint[] memory nodesInGroup = getNodesInGroup(groupIndex);
        uint index;
        bytes32 monitorIndex;
        for (uint i = 0; i < nodesInGroup.length; i++) {
            monitorIndex = keccak256(abi.encodePacked(nodesInGroup[i]));
            (index, ) = _find(monitorIndex, nodeIndex);
            if (index < checkedNodes[monitorIndex].length) {
                if (index != checkedNodes[monitorIndex].length - 1) {
                    checkedNodes[monitorIndex][index] =
                        checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
                }
                delete checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
                checkedNodes[monitorIndex].pop();
            }
        }
        deleteGroup(groupIndex);
    }

    function sendVerdict(uint fromMonitorIndex, Verdict calldata verdict) external allow(_executorName) {
        uint index;
        uint32 time;
        bytes32 monitorIndex = keccak256(abi.encodePacked(fromMonitorIndex));
        (index, time) = _find(monitorIndex, verdict.toNodeIndex);
        require(time > 0, "Checked Node does not exist in MonitorsArray");
        if (time <= block.timestamp) {
            if (index != checkedNodes[monitorIndex].length - 1) {
                checkedNodes[monitorIndex][index] = checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
            }
            delete checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
            checkedNodes[monitorIndex].pop();
            ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
            bool receiveVerdict = time.add(constantsHolder.deltaPeriod()) > uint32(block.timestamp);
            if (receiveVerdict) {
                addVerdict(keccak256(abi.encodePacked(verdict.toNodeIndex)), verdict.downtime, verdict.latency);
            }
            _emitVerdictsEvent(fromMonitorIndex, verdict, receiveVerdict);
        }
    }

    function calculateMetrics(uint nodeIndex)
        external
        allow(_executorName)
        returns (uint averageDowntime, uint averageLatency)
    {
        bytes32 monitorIndex = keccak256(abi.encodePacked(nodeIndex));
        uint lengthOfArray = getLengthOfMetrics(monitorIndex);
        uint[] memory downtimeArray = new uint[](lengthOfArray);
        uint[] memory latencyArray = new uint[](lengthOfArray);
        for (uint i = 0; i < lengthOfArray; i++) {
            downtimeArray[i] = verdicts[monitorIndex][i][0];
            latencyArray[i] = verdicts[monitorIndex][i][1];
        }
        if (lengthOfArray > 0) {
            averageDowntime = _median(downtimeArray);
            averageLatency = _median(latencyArray);
        }
        while (verdicts[monitorIndex].length > 0) {
            verdicts[monitorIndex].pop();
        }
    }

    function setLastBountyBlock(uint nodeIndex) external allow("SkaleManager") {
        lastBountyBlocks[keccak256(abi.encodePacked(nodeIndex))] = block.number;
    }

     function setLastReceivedVerdictBlock(uint nodeIndex) external allow(_executorName) {
        lastVerdictBlocks[keccak256(abi.encodePacked(nodeIndex))] = block.number;
    }

    function getCheckedArray(bytes32 monitorIndex) external view returns (bytes32[] memory) {
        return checkedNodes[monitorIndex];
    }

    function getLastBountyBlock(uint nodeIndex) external view returns (uint) {
        return lastBountyBlocks[keccak256(abi.encodePacked(nodeIndex))];
    }

    function addCheckedNode(bytes32 monitorIndex, bytes32 data) public allow(_executorName) {
        uint indexLength = 14;
        require(data.length >= indexLength, "data is too small");
        for (uint i = 0; i < checkedNodes[monitorIndex].length; ++i) {
            require(checkedNodes[monitorIndex][i].length >= indexLength, "checked nodes data is too small");
            uint shift = (32 - indexLength).mul(8);
            bool equalIndex = checkedNodes[monitorIndex][i] >> shift == data >> shift;
            if (equalIndex) {
                checkedNodes[monitorIndex][i] = data;
                return;
            }
        }
        checkedNodes[monitorIndex].push(data);
    }

    function addVerdict(bytes32 monitorIndex, uint32 downtime, uint32 latency) public allow(_executorName) {
        verdicts[monitorIndex].push([uint(downtime), uint(latency)]);
    }

    function initialize(address newContractsAddress) public override initializer {
        Groups.initialize("SkaleManager", newContractsAddress);
    }

    function getLengthOfMetrics(bytes32 monitorIndex) public view returns (uint) {
        return verdicts[monitorIndex].length;
    }

    function getLastReceivedVerdictBlock(uint nodeIndex) public view returns (uint) {
        return lastVerdictBlocks[keccak256(abi.encodePacked(nodeIndex))];
    }

    function _generateGroup(bytes32 groupIndex)
        internal
        allow(_executorName)
        returns (uint[] memory)
    {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        require(isGroupActive(groupIndex), "Group is not active");
        uint exceptionNode = uint(getGroupData(groupIndex));
        uint[] memory activeNodes = nodes.getActiveNodeIds();
        uint numberOfNodesInGroup = getRecommendedNumberOfNodes(groupIndex);
        uint availableAmount = activeNodes.length.sub((nodes.isNodeActive(exceptionNode)) ? 1 : 0);
        if (numberOfNodesInGroup > availableAmount) {
            numberOfNodesInGroup = availableAmount;
        }
        uint[] memory nodesInGroup = new uint[](numberOfNodesInGroup);
        uint ignoringTail = 0;
        uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
        for (uint i = 0; i < nodesInGroup.length; ++i) {
            uint index = random % (activeNodes.length.sub(ignoringTail));
            if (activeNodes[index] == exceptionNode) {
                _swap(activeNodes, index, activeNodes.length.sub(ignoringTail) - 1);
                ++ignoringTail;
                index = random % (activeNodes.length.sub(ignoringTail));
            }
            nodesInGroup[i] = activeNodes[index];
            _swap(activeNodes, index, activeNodes.length.sub(ignoringTail) - 1);
            ++ignoringTail;
            setNodeInGroup(groupIndex, nodesInGroup[i]);
        }
        emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
        return nodesInGroup;
    }

    function _median(uint[] memory values) internal pure returns (uint) {
        if (values.length < 1) {
            revert("Can't calculate _median of empty array");
        }
        _quickSort(values, 0, values.length - 1);
        return values[values.length / 2];
    }

    function _setMonitors(bytes32 groupIndex, uint nodeIndex) internal returns (uint) {
        setException(groupIndex, nodeIndex);
        uint[] memory indexOfNodesInGroup = _generateGroup(groupIndex);
        bytes32 bytesParametersOfNodeIndex = _getDataToBytes(nodeIndex);
        for (uint i = 0; i < indexOfNodesInGroup.length; i++) {
            bytes32 index = keccak256(abi.encodePacked(indexOfNodesInGroup[i]));
            addCheckedNode(index, bytesParametersOfNodeIndex);
        }
        emit MonitorsArray(
            nodeIndex,
            groupIndex,
            indexOfNodesInGroup,
            uint32(block.timestamp),
            gasleft());
        return indexOfNodesInGroup.length;
    }

    /**
     * @dev _upgradeGroup - upgrade Group at Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function _upgradeGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data)
        internal
        allow(_executorName)
    {
        require(groups[groupIndex].active, "Group is not active");

        groups[groupIndex].recommendedNumberOfNodes = newRecommendedNumberOfNodes;
        groups[groupIndex].groupData = data;
        uint[4] memory previousKey = groups[groupIndex].groupsPublicKey;
        previousPublicKeys[groupIndex].push(previousKey);
        delete groups[groupIndex].groupsPublicKey;
        delete groups[groupIndex].nodesInGroup;
        while (groups[groupIndex].nodesInGroup.length > 0) {
            groups[groupIndex].nodesInGroup.pop();
        }

        emit GroupUpgraded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }

    function _find(bytes32 monitorIndex, uint nodeIndex) internal view returns (uint index, uint32 time) {
        bytes32[] memory nodes = checkedNodes[monitorIndex];
        uint possibleIndex;
        uint32 possibleTime;
        index = nodes.length;
        for (uint i = 0; i < nodes.length; i++) {
            (possibleIndex, possibleTime) = _getDataFromBytes(nodes[i]);
            if (possibleIndex == nodeIndex && (time == 0 || possibleTime < time)) {
                index = i;
                time = possibleTime;
            }
        }
    }

    function _quickSort(uint[] memory array, uint left, uint right) internal pure {
        uint leftIndex = left;
        uint rightIndex = right;
        uint middle = array[(right.add(left)) / 2];
        while (leftIndex <= rightIndex) {
            while (array[leftIndex] < middle) {
                leftIndex++;
                }
            while (middle < array[rightIndex]) {
                rightIndex--;
                }
            if (leftIndex <= rightIndex) {
                (array[leftIndex], array[rightIndex]) = (array[rightIndex], array[leftIndex]);
                leftIndex++;
                rightIndex = (rightIndex > 0 ? rightIndex - 1 : 0);
            }
        }
        if (left < rightIndex)
            _quickSort(array, left, rightIndex);
        if (leftIndex < right)
            _quickSort(array, leftIndex, right);
    }

    function _getDataFromBytes(bytes32 data) internal pure returns (uint index, uint32 time) {
        bytes memory tempBytes = new bytes(32);
        bytes14 bytesIndex;
        bytes14 bytesTime;
        assembly {
            mstore(add(tempBytes, 32), data)
            bytesIndex := mload(add(tempBytes, 32))
            bytesTime := mload(add(tempBytes, 46))
        }
        index = uint112(bytesIndex);
        time = uint32(uint112(bytesTime));
    }

    function _getDataToBytes(uint nodeIndex) internal view returns (bytes32 bytesParameters) {
        ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        bytes memory tempData = new bytes(32);
        bytes14 bytesOfIndex = bytes14(uint112(nodeIndex));
        bytes14 bytesOfTime = bytes14(
            uint112(nodes.getNodeNextRewardDate(nodeIndex).sub(constantsHolder.deltaPeriod()))
        );
        bytes4 ip = nodes.getNodeIP(nodeIndex);
        assembly {
            mstore(add(tempData, 32), bytesOfIndex)
            mstore(add(tempData, 46), bytesOfTime)
            mstore(add(tempData, 60), ip)
            bytesParameters := mload(add(tempData, 32))
        }
    }

    function _emitVerdictsEvent(
        uint fromMonitorIndex,
        Verdict memory verdict,
        bool receiveVerdict
    )
        internal
    {
        uint previousBlockEvent = getLastReceivedVerdictBlock(verdict.toNodeIndex);
        lastVerdictBlocks[keccak256(abi.encodePacked(verdict.toNodeIndex))] = block.number;

        emit VerdictWasSent(
                fromMonitorIndex,
                verdict.toNodeIndex,
                verdict.downtime,
                verdict.latency,
                receiveVerdict,
                previousBlockEvent,
                uint32(block.timestamp),
                gasleft()
            );
    }
}
