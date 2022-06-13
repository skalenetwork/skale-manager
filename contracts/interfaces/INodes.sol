// SPDX-License-Identifier: AGPL-3.0-only

/*
    INodes.sol - SKALE Manager
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

pragma solidity >=0.6.10 <0.9.0;

import "./utils/IRandom.sol";

interface INodes {
    // All Nodes states
    enum NodeStatus {Active, Leaving, Left, In_Maintenance}

    struct Node {
        string name;
        bytes4 ip;
        bytes4 publicIP;
        uint16 port;
        bytes32[2] publicKey;
        uint startBlock;
        uint lastRewardDate;
        uint finishTime;
        NodeStatus status;
        uint validatorId;
    }

    // struct to note which Nodes and which number of Nodes owned by user
    struct CreatedNodes {
        mapping (uint => bool) isNodeExist;
        uint numberOfNodes;
    }

    struct SpaceManaging {
        uint8 freeSpace;
        uint indexInSpaceMap;
    }

    struct NodeCreationParams {
        string name;
        bytes4 ip;
        bytes4 publicIp;
        uint16 port;
        bytes32[2] publicKey;
        uint16 nonce;
        string domainName;
    }
    
    /**
     * @dev Emitted when a node is created.
     */
    event NodeCreated(
        uint nodeIndex,
        address owner,
        string name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        uint16 nonce,
        string domainName
    );

    /**
     * @dev Emitted when a node completes a network exit.
     */
    event ExitCompleted(
        uint nodeIndex
    );

    /**
     * @dev Emitted when a node begins to exit from the network.
     */
    event ExitInitialized(
        uint nodeIndex,
        uint startLeavingPeriod
    );

    /**
     * @dev Emitted when a node set to in compliant or compliant.
     */
    event IncompliantNode(
        uint indexed nodeIndex,
        bool status
    );

    /**
     * @dev Emitted when a node set to in maintenance or from in maintenance.
     */
    event MaintenanceNode(
        uint indexed nodeIndex,
        bool status
    );

    /**
     * @dev Emitted when a node status changed.
     */
    event IPChanged(
        uint indexed nodeIndex,
        bytes4 previousIP,
        bytes4 newIP
    );
    
    function removeSpaceFromNode(uint nodeIndex, uint8 space) external returns (bool);
    function addSpaceToNode(uint nodeIndex, uint8 space) external;
    function changeNodeLastRewardDate(uint nodeIndex) external;
    function changeNodeFinishTime(uint nodeIndex, uint time) external;
    function createNode(address from, NodeCreationParams calldata params) external;
    function initExit(uint nodeIndex) external;
    function completeExit(uint nodeIndex) external returns (bool);
    function deleteNodeForValidator(uint validatorId, uint nodeIndex) external;
    function checkPossibilityCreatingNode(address nodeAddress) external;
    function checkPossibilityToMaintainNode(uint validatorId, uint nodeIndex) external returns (bool);
    function setNodeInMaintenance(uint nodeIndex) external;
    function removeNodeFromInMaintenance(uint nodeIndex) external;
    function setNodeIncompliant(uint nodeIndex) external;
    function setNodeCompliant(uint nodeIndex) external;
    function setDomainName(uint nodeIndex, string memory domainName) external;
    function makeNodeVisible(uint nodeIndex) external;
    function makeNodeInvisible(uint nodeIndex) external;
    function changeIP(uint nodeIndex, bytes4 newIP, bytes4 newPublicIP) external;
    function numberOfActiveNodes() external view returns (uint);
    function incompliant(uint nodeIndex) external view returns (bool);
    function getRandomNodeWithFreeSpace(
        uint8 freeSpace,
        IRandom.RandomGenerator memory randomGenerator
    )
        external
        view
        returns (uint);
    function isTimeForReward(uint nodeIndex) external view returns (bool);
    function getNodeIP(uint nodeIndex) external view returns (bytes4);
    function getNodeDomainName(uint nodeIndex) external view returns (string memory);
    function getNodePort(uint nodeIndex) external view returns (uint16);
    function getNodePublicKey(uint nodeIndex) external view returns (bytes32[2] memory);
    function getNodeAddress(uint nodeIndex) external view returns (address);
    function getNodeFinishTime(uint nodeIndex) external view returns (uint);
    function isNodeLeft(uint nodeIndex) external view returns (bool);
    function isNodeInMaintenance(uint nodeIndex) external view returns (bool);
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint);
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint);
    function getNumberOfNodes() external view returns (uint);
    function getNumberOnlineNodes() external view returns (uint);
    function getActiveNodeIds() external view returns (uint[] memory activeNodeIds);
    function getNodeStatus(uint nodeIndex) external view returns (NodeStatus);
    function getValidatorNodeIndexes(uint validatorId) external view returns (uint[] memory);
    function countNodesWithFreeSpace(uint8 freeSpace) external view returns (uint count);
    function getValidatorId(uint nodeIndex) external view returns (uint);
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function isNodeLeaving(uint nodeIndex) external view returns (bool);
}
