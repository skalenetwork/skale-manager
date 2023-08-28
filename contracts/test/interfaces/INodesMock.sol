// SPDX-License-Identifier: AGPL-3.0-only

/*
    INodesMock.sol - SKALE Manager
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


interface INodesMock {
    function registerNodes(uint256 amount, uint256 validatorId) external;
    function removeNode(uint256 nodeId) external;
    function changeNodeLastRewardDate(uint256 nodeId) external;
    function getNodeLastRewardDate(uint256 nodeIndex) external view returns (uint256 timestamp);
    function isNodeLeft(uint256 nodeId) external view returns (bool left);
    function getNumberOnlineNodes() external view returns (uint256 amount);
    function getValidatorId(uint256 nodeId) external view returns (uint256 id);
    function checkPossibilityToMaintainNode(
        uint256 /* validatorId */,
        uint256 /* nodeIndex */
    ) external pure returns (bool possible);
}
