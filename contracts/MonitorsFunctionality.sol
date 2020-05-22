/*
    MonitorsFunctionality.sol - SKALE Manager
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

import "./GroupsFunctionality.sol";
import "./ConstantsHolder.sol";
import "./Nodes.sol";
import "./MonitorsData.sol";


contract MonitorsFunctionality is GroupsFunctionality {

    using StringUtils for string;

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
        MonitorsData.Verdict verdict,
        bool status,
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
        addGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
        uint numberOfNodesInGroup = _setMonitors(groupIndex, nodeIndex);
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
        upgradeGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
        uint numberOfNodesInGroup = _setMonitors(groupIndex, nodeIndex);
        emit MonitorUpgraded(
            nodeIndex,
            groupIndex,
            numberOfNodesInGroup,
            uint32(block.timestamp), gasleft()
        );
    }

    function deleteMonitor(uint nodeIndex) external allow(_executorName) {
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        MonitorsData data = MonitorsData(_contractManager.getContract("MonitorsData"));
        data.removeAllVerdicts(groupIndex);
        data.removeAllCheckedNodes(groupIndex);
        uint[] memory nodesInGroup = data.getNodesInGroup(groupIndex);
        uint index;
        bytes32 monitorIndex;
        for (uint i = 0; i < nodesInGroup.length; i++) {
            monitorIndex = keccak256(abi.encodePacked(nodesInGroup[i]));
            (index, ) = _find(monitorIndex, nodeIndex);
            if (index < data.getCheckedArrayLength(monitorIndex)) {
                data.removeCheckedNode(monitorIndex, index);
            }
        }
        deleteGroup(groupIndex);
    }

    function sendVerdict(uint fromMonitorIndex, MonitorsData.Verdict calldata verdict) external allow(_executorName) {
        uint index;
        uint32 time;
        bytes32 monitorIndex = keccak256(abi.encodePacked(fromMonitorIndex));
        (index, time) = _find(monitorIndex, verdict.toNodeIndex);
        require(time > 0, "Checked Node does not exist in MonitorsArray");
        if (time <= block.timestamp) {
            MonitorsData data = MonitorsData(_contractManager.getContract("MonitorsData"));
            data.removeCheckedNode(monitorIndex, index);
            ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
            bool receiveVerdict = time.add(constantsHolder.deltaPeriod()) > uint32(block.timestamp);
            if (receiveVerdict) {
                data.addVerdict(keccak256(abi.encodePacked(verdict.toNodeIndex)), verdict.downtime, verdict.latency);
            }
            emit VerdictWasSent(
                fromMonitorIndex,
                verdict.toNodeIndex,
                verdict,
                receiveVerdict, uint32(block.timestamp), gasleft());
        }
    }

    function calculateMetrics(uint nodeIndex)
        external allow(_executorName)
        returns (uint averageDowntime, uint averageLatency)
    {
        MonitorsData data = MonitorsData(_contractManager.getContract("MonitorsData"));
        bytes32 monitorIndex = keccak256(abi.encodePacked(nodeIndex));
        uint lengthOfArray = data.getLengthOfMetrics(monitorIndex);
        uint[] memory downtimeArray = new uint[](lengthOfArray);
        uint[] memory latencyArray = new uint[](lengthOfArray);
        for (uint i = 0; i < lengthOfArray; i++) {
            downtimeArray[i] = data.verdicts(monitorIndex, i, 0);
            latencyArray[i] = data.verdicts(monitorIndex, i, 1);
        }
        if (lengthOfArray > 0) {
            averageDowntime = _median(downtimeArray);
            averageLatency = _median(latencyArray);
        }
        data.removeAllVerdicts(monitorIndex);
    }

    function initialize(address contractManager) public override initializer {
        GroupsFunctionality.initialize(
            "SkaleManager",
            "MonitorsData",
            contractManager);
    }

    function _generateGroup(bytes32 groupIndex) internal override allow(_executorName) returns (uint[] memory) {
        address dataAddress = _contractManager.getContract(_dataName);
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));

        require(IGroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");

        uint exceptionNode = uint(IGroupsData(dataAddress).getGroupData(groupIndex));
        uint[] memory activeNodes = nodes.getActiveNodeIds();
        uint numberOfNodesInGroup = IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
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
            IGroupsData(dataAddress).setNodeInGroup(groupIndex, nodesInGroup[i]);
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
        MonitorsData data = MonitorsData(_contractManager.getContract("MonitorsData"));
        data.setException(groupIndex, nodeIndex);
        uint[] memory indexOfNodesInGroup = _generateGroup(groupIndex);
        bytes32 bytesParametersOfNodeIndex = _getDataToBytes(nodeIndex);
        for (uint i = 0; i < indexOfNodesInGroup.length; i++) {
            bytes32 index = keccak256(abi.encodePacked(indexOfNodesInGroup[i]));
            data.addCheckedNode(index, bytesParametersOfNodeIndex);
        }
        emit MonitorsArray(
            nodeIndex,
            groupIndex,
            indexOfNodesInGroup,
            uint32(block.timestamp),
            gasleft());
        return indexOfNodesInGroup.length;
    }

    function _find(bytes32 monitorIndex, uint nodeIndex) internal view returns (uint index, uint32 time) {
        MonitorsData data = MonitorsData(_contractManager.getContract("MonitorsData"));
        bytes32[] memory checkedNodes = data.getCheckedArray(monitorIndex);
        uint possibleIndex;
        uint32 possibleTime;
        index = checkedNodes.length;
        for (uint i = 0; i < checkedNodes.length; i++) {
            (possibleIndex, possibleTime) = _getDataFromBytes(checkedNodes[i]);
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
}
