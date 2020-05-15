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
import "./interfaces/IConstants.sol";
import "./Nodes.sol";


contract Monitors is Groups {

    using StringUtils for string;

    struct Verdict {
        uint toNodeIndex;
        uint32 downtime;
        uint32 latency;
    }

    mapping (bytes32 => bytes32[]) public checkedNodes;
    mapping (bytes32 => uint32[][]) public verdicts;

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
        Verdict verdict,
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

    function addMonitor(uint nodeIndex) external allow("SkaleManager") {
        IConstants constantsHolder = IConstants(_contractManager.getContract("ConstantsHolder"));
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

    function upgradeMonitor(uint nodeIndex) external allow("SkaleManager") {
        IConstants constantsHolder = IConstants(_contractManager.getContract("ConstantsHolder"));
        bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
        uint possibleNumberOfNodes = constantsHolder.NUMBER_OF_MONITORS();
        upgradeGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
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

    function deleteMonitor(uint nodeIndex) external allow("SkaleManager") {
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

    function sendVerdict(uint fromMonitorIndex, Verdict calldata verdict) external allow("SkaleManager") {
        uint index;
        uint32 time;
        bytes32 monitorIndex = keccak256(abi.encodePacked(fromMonitorIndex));
        (index, time) = _find(monitorIndex, verdict.toNodeIndex);
        require(time > 0, "Checked Node does not exist in MonitorsArray");
        string memory message = "The time has not come to send verdict for ";
        require(
            time <= block.timestamp,
            message.strConcat(StringUtils.uint2str(verdict.toNodeIndex)).strConcat(" Node"));
        if (index != checkedNodes[monitorIndex].length - 1) {
            checkedNodes[monitorIndex][index] = checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
        }
        delete checkedNodes[monitorIndex][checkedNodes[monitorIndex].length - 1];
        checkedNodes[monitorIndex].pop();
        address constantsAddress = _contractManager.getContract("ConstantsHolder");
        bool receiveVerdict = time.add(IConstants(constantsAddress).deltaPeriod()) > uint32(block.timestamp);
        if (receiveVerdict) {
            verdicts[keccak256(abi.encodePacked(verdict.toNodeIndex))].push([verdict.downtime, verdict.latency]);
        }
        emit VerdictWasSent(
            fromMonitorIndex,
            verdict.toNodeIndex,
            verdict,
            receiveVerdict, uint32(block.timestamp), gasleft());
    }

    function calculateMetrics(uint nodeIndex)
        external
        allow("SkaleManager")
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
            while (verdicts[monitorIndex].length > 0) {
                verdicts[monitorIndex].pop();
            }
        }
    }

    function getCheckedArray(bytes32 monitorIndex) external view returns (bytes32[] memory) {
        return checkedNodes[monitorIndex];
    }

    function initialize(address newContractsAddress) public override initializer {
        Groups.initialize("Monitors", newContractsAddress);
    }

    function getLengthOfMetrics(bytes32 monitorIndex) public view returns (uint) {
        return verdicts[monitorIndex].length;
    }

    function _generateGroup(bytes32 groupIndex)
        internal
        override
        allow("SkaleManager")
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
            bool stop = false;
            bytes32 index = keccak256(abi.encodePacked(indexOfNodesInGroup[i]));
            uint indexLength = 14;
            require(bytesParametersOfNodeIndex.length >= indexLength, "data is too small");
            for (uint j = 0; j < checkedNodes[index].length; ++j) {
                require(checkedNodes[index][j].length >= indexLength, "checked nodes data is too small");
                uint shift = (32 - indexLength).mul(8);
                if (checkedNodes[index][j] >> shift == bytesParametersOfNodeIndex >> shift) {
                    checkedNodes[index][j] = bytesParametersOfNodeIndex;
                    stop = true;
                }
            }
            if (!stop) {
                checkedNodes[index].push(bytesParametersOfNodeIndex);
            }
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
        address constantsAddress = _contractManager.getContract("ConstantsHolder");
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        bytes memory tempData = new bytes(32);
        bytes14 bytesOfIndex = bytes14(uint112(nodeIndex));
        bytes14 bytesOfTime = bytes14(
            uint112(nodes.getNodeNextRewardDate(nodeIndex).sub(IConstants(constantsAddress).deltaPeriod()))
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
