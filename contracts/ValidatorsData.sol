/*
    ValidatorsData.sol - SKALE Manager
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

import "./GroupsData.sol";


contract ValidatorsData is GroupsData {


    struct Metrics {
        uint32 downtime;
        uint32 latency;
    }

    struct Validator {
        uint nodeIndex;
        bytes32[] validatedNodes;
        Metrics[] verdicts;
    }

    mapping (bytes32 => bytes32[]) public validatedNodes;
    //mapping (bytes32 => Metrics[]) public verdicts;
    mapping (bytes32 => uint32[][]) public verdicts;

    constructor(string memory newExecutorName, address newContractsAddress) GroupsData(newExecutorName, newContractsAddress) public {

    }

    function addValidatedNode(bytes32 validatorIndex, bytes32 data) public allow(executorName) {
        for (uint i = 0; i < validatedNodes[validatorIndex].length; ++i) {
            if (validatedNodes[validatorIndex][i] == data) {
                return;
            }
        }
        validatedNodes[validatorIndex].push(data);
    }

    function addVerdict(bytes32 validatorIndex, uint32 downtime, uint32 latency) public allow(executorName) {
        verdicts[validatorIndex].push([downtime, latency]);
    }

    function removeValidatedNode(bytes32 validatorIndex, uint indexOfValidatedNode) public allow(executorName) {
        if (indexOfValidatedNode != validatedNodes[validatorIndex].length - 1) {
            validatedNodes[validatorIndex][indexOfValidatedNode] = validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
        }
        delete validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
        validatedNodes[validatorIndex].length--;
    }

    function removeAllValidatedNodes(bytes32 validatorIndex) public allow(executorName) {
        delete validatedNodes[validatorIndex];
    }

    function removeAllVerdicts(bytes32 validatorIndex) public allow(executorName) {
        verdicts[validatorIndex].length = 0;
    }

    function getValidatedArray(bytes32 validatorIndex) public view returns (bytes32[] memory) {
        return validatedNodes[validatorIndex];
    }

    function getLengthOfMetrics(bytes32 validatorIndex) public view returns (uint) {
        return verdicts[validatorIndex].length;
    }
}
