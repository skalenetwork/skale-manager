// SPDX-License-Identifier: AGPL-3.0-only

/*
    Nodes.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin
    @author Dmytro Stebaiev
    @author Vadim Yavorsky

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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/SafeCast.sol";

import "./Permissions.sol";
import "./ConstantsHolder.sol";
import "./delegation/ValidatorService.sol";
import "./delegation/DelegationController.sol";


/**
 * @title Nodes
 * @dev This contract contains all logic to manage SKALE Network nodes states,
 * space availability, stake requirement checks, and exit functions.
 *
 * Nodes may be in one of several states:
 *
 * - Active:    Node is registered and is in network operation.
 * - Leaving:   Node has begun exiting from the network.
 * - Left:      Node has left the network.
 *
 * Note: Online nodes contain both Active and Leaving states.
 */
contract Nodes is Permissions {
    
    using SafeCast for uint;

    // All Nodes states
    enum NodeStatus {Active, Leaving, Left}

    struct Node {
        string name;
        bytes4 ip;
        bytes4 publicIP;
        uint16 port;
        bytes32[2] publicKey;
        uint startBlock;
        uint32 lastRewardDate;
        uint32 finishTime;
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

    // TODO: move outside the contract
    struct NodeCreationParams {
        string name;
        bytes4 ip;
        bytes4 publicIp;
        uint16 port;
        bytes32[2] publicKey;
        uint16 nonce;
    }

    // array which contain all Nodes
    Node[] public nodes;

    SpaceManaging[] public spaceOfNodes;

    // mapping for checking which Nodes and which number of Nodes owned by user
    mapping (address => CreatedNodes) public nodeIndexes;
    // mapping for checking is IP address busy
    mapping (bytes4 => bool) public nodesIPCheck;
    // mapping for checking is Name busy
    mapping (bytes32 => bool) public nodesNameCheck;
    // mapping for indication from Name to Index
    mapping (bytes32 => uint) public nodesNameToIndex;
    // mapping for indication from space to Nodes
    mapping (uint8 => uint[]) public spaceToNodes;

    mapping (uint => uint[]) public validatorToNodeIndexes;

    uint public numberOfActiveNodes;
    uint public numberOfLeavingNodes;
    uint public numberOfLeftNodes;

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
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev Emitted when a node completes a network exit.
     */
    event ExitCompleted(
        uint nodeIndex,
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev Emitted when a node begins to exit from the network.
     */
    event ExitInitialized(
        uint nodeIndex,
        uint32 startLeavingPeriod,
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev Allows Schains and SchainsInternal contracts to occupy available
     * capacity on a node.
     *
     * Returns boolean whether operation is successful.
     */
    function removeSpaceFromNode(uint nodeIndex, uint8 space)
        external
        allowTwo("Schains", "SchainsInternal")
        returns (bool)
    {
        if (spaceOfNodes[nodeIndex].freeSpace < space) {
            return false;
        }
        if (space > 0) {
            _moveNodeToNewSpaceMap(
                nodeIndex,
                uint(spaceOfNodes[nodeIndex].freeSpace).sub(space).toUint8()
            );
        }
        return true;
    }

    /**
     * @dev Allows Schains contract to occupy available capacity on a node.
     *
     * Returns boolean whether operation is successful.
     */
    function addSpaceToNode(uint nodeIndex, uint8 space) external allow("Schains") {
        if (space > 0) {
            _moveNodeToNewSpaceMap(
                nodeIndex,
                uint(spaceOfNodes[nodeIndex].freeSpace).add(space).toUint8()
            );
        }
    }

    /**
     * @dev Allows SkaleManager to change a node's last reward date.
     */
    function changeNodeLastRewardDate(uint nodeIndex) external allow("SkaleManager") {
        nodes[nodeIndex].lastRewardDate = uint32(block.timestamp);
    }

    function changeNodeFinishTime(uint nodeIndex, uint32 time) external allow("SkaleManager") {
        nodes[nodeIndex].finishTime = time;
    }

    /**
     * @dev Allows SkaleManager contract to create new node and adds it to the
     * Nodes contract.
     *
     * Emits NodeCreated event.
     *
     * Requirements:
     *
     * - Node must be non-zero
     * - Node IP must be available
     * - Node name must not already be registered
     * - Node port must be greater than zero
     */
    function createNode(address from, NodeCreationParams calldata params)
        external
        allow("SkaleManager")
        returns (uint nodeIndex)
    {
        // checks that Node has correct data
        require(params.ip != 0x0 && !nodesIPCheck[params.ip], "IP address is zero or is not available");
        require(!nodesNameCheck[keccak256(abi.encodePacked(params.name))], "Name is already registered");
        require(params.port > 0, "Port is zero");

        uint validatorId = ValidatorService(
            contractManager.getContract("ValidatorService")).getValidatorIdByNodeAddress(from);

        // adds Node to Nodes contract
        nodeIndex = _addNode(
            from,
            params.name,
            params.ip,
            params.publicIp,
            params.port,
            params.publicKey,
            validatorId);

        emit NodeCreated(
            nodeIndex,
            from,
            params.name,
            params.ip,
            params.publicIp,
            params.port,
            params.nonce,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev Allows SkaleManager contract to initiate a node exit procedure.
     *
     * Returns a boolean whether the operation is successful.
     *
     * Emits ExitInitialized event.
     */
    function initExit(uint nodeIndex) external allow("SkaleManager") returns (bool) {

        _setNodeLeaving(nodeIndex);

        emit ExitInitialized(
            nodeIndex,
            uint32(block.timestamp),
            uint32(block.timestamp),
            gasleft());
        return true;
    }

    /**
     * @dev Allows SkaleManager contract to complete a node exit procedure.
     *
     * Returns a boolean whether the operation is successful.
     *
     * Emits ExitCompleted event.
     *
     * Requirements:
     *
     * - Node must have already initialized a node exit procedure.
     */
    function completeExit(uint nodeIndex) external allow("SkaleManager") returns (bool) {
        require(isNodeLeaving(nodeIndex), "Node is not Leaving");

        _setNodeLeft(nodeIndex);
        _deleteNode(nodeIndex);

        emit ExitCompleted(
            nodeIndex,
            uint32(block.timestamp),
            gasleft());
        return true;
    }

    /**
     * @dev Allows SkaleManager contract to delete a validator's node.
     *
     * Requirements:
     *
     * - Validator ID must exist.
     */
    function deleteNodeForValidator(uint validatorId, uint nodeIndex) external allow("SkaleManager") {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        uint[] memory validatorNodes = validatorToNodeIndexes[validatorId];
        uint position = _findNode(validatorNodes, nodeIndex);
        if (position < validatorNodes.length) {
            validatorToNodeIndexes[validatorId][position] =
                validatorToNodeIndexes[validatorId][validatorNodes.length.sub(1)];
        }
        validatorToNodeIndexes[validatorId].pop();
    }

    /**
     * @dev Allows SkaleManager contract to check whether a validator has
     * sufficient stake to create another node.
     *
     * Requirements:
     *
     * - Validator must be included on trusted list if trusted list is enabled.
     * - Validator must have sufficient stake to operate an additional node.
     */
    function checkPossibilityCreatingNode(address nodeAddress) external allow("SkaleManager") {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        uint validatorId = validatorService.getValidatorIdByNodeAddress(nodeAddress);
        require(validatorService.trustedValidators(validatorId), "Validator is not authorized to create a node");
        uint[] memory validatorNodes = validatorToNodeIndexes[validatorId];
        uint delegationsTotal = delegationController.getAndUpdateDelegatedToValidatorNow(validatorId);
        uint msr = ConstantsHolder(contractManager.getContract("ConstantsHolder")).msr();
        require(
            validatorNodes.length.add(1).mul(msr) <= delegationsTotal,
            "Validator must meet the Minimum Staking Requirement");
    }

    /**
     * @dev Allows SkaleManager contract to check whether a validator has
     * sufficient stake to maintain a node.
     *
     * Returns boolean whether validator can maintain node with current stake.
     *
     * Requirements:
     *
     * - Validator ID and nodeIndex must both exist.
     */
    function checkPossibilityToMaintainNode(uint validatorId, uint nodeIndex)
        external allow("SkaleManager") returns (bool)
    {
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        uint[] memory validatorNodes = validatorToNodeIndexes[validatorId];
        uint position = _findNode(validatorNodes, nodeIndex);
        require(position < validatorNodes.length, "Node does not exist for this Validator");
        uint delegationsTotal = delegationController.getAndUpdateDelegatedToValidatorNow(validatorId);
        uint msr = ConstantsHolder(contractManager.getContract("ConstantsHolder")).msr();
        return position.add(1).mul(msr) <= delegationsTotal;
    }

    /**
     * @dev Returns nodes with resource availability.
     */
    function getNodesWithFreeSpace(uint8 freeSpace) external view returns (uint[] memory) {
        uint[] memory nodesWithFreeSpace = new uint[](countNodesWithFreeSpace(freeSpace));
        uint cursor = 0;
        for (uint8 i = freeSpace; i <= 128; ++i) {
            for (uint j = 0; j < spaceToNodes[i].length; j++) {
                nodesWithFreeSpace[cursor] = spaceToNodes[i][j];
                ++cursor;
            }
        }
        return nodesWithFreeSpace;
    }

    /**
     * @dev Checks whether time for a node's reward has come.
     */
    function isTimeForReward(uint nodeIndex) external view returns (bool) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        return uint(nodes[nodeIndex].lastRewardDate).add(constantsHolder.rewardPeriod()) <= block.timestamp;
    }

    /**
     * @dev Checks whether node at a given address exists.
     */
    function isNodeExist(address from, uint nodeIndex) external view returns (bool) {
        return nodeIndexes[from].isNodeExist[nodeIndex];
    }

    /**
     * @dev Returns IP address of a given node.
     *
     * Requirements:
     *
     * - Node must exist.
     */
    function getNodeIP(uint nodeIndex) external view returns (bytes4) {
        require(nodeIndex < nodes.length, "Node does not exist");
        return nodes[nodeIndex].ip;
    }

    /**
     * @dev Returns the port of a given node.
     */
    function getNodePort(uint nodeIndex) external view returns (uint16) {
        return nodes[nodeIndex].port;
    }

    /**
     * @dev Returns the public key of a given node.
     */
    function getNodePublicKey(uint nodeIndex) external view returns (bytes32[2] memory) {
        return nodes[nodeIndex].publicKey;
    }

    function getNodeFinishTime(uint nodeIndex) external view returns (uint32) {
        return nodes[nodeIndex].finishTime;
    }

    /**
     * @dev Checks whether a node has left the network.
     */
    function isNodeLeft(uint nodeIndex) external view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Left;
    }

    /**
     * @dev Returns a given node's last reward date.
     */
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32) {
        return nodes[nodeIndex].lastRewardDate;
    }

    /**
     * @dev Returns a given node's next reward date.
     */
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint32) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        return uint(nodes[nodeIndex].lastRewardDate).add(constantsHolder.rewardPeriod()).toUint32();
    }

    /**
     * @dev Returns the total number of registered nodes.
     */
    function getNumberOfNodes() external view returns (uint) {
        return nodes.length;
    }

    /**
     * @dev Returns the total number of online nodes.
     * Online nodes are equal to the number of active plus leaving nodes.
     */
    function getNumberOnlineNodes() external view returns (uint) {
        return numberOfActiveNodes.add(numberOfLeavingNodes);
    }

    /**
     * @dev Returns IPs of active nodes.
     */
    function getActiveNodeIPs() external view returns (bytes4[] memory activeNodeIPs) {
        activeNodeIPs = new bytes4[](numberOfActiveNodes);
        uint indexOfActiveNodeIPs = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (isNodeActive(indexOfNodes)) {
                activeNodeIPs[indexOfActiveNodeIPs] = nodes[indexOfNodes].ip;
                indexOfActiveNodeIPs++;
            }
        }
    }

    /**
     * @dev Returns active nodes linked to the msg.sender (validator address).
     */
    function getActiveNodesByAddress() external view returns (uint[] memory activeNodesByAddress) {
        activeNodesByAddress = new uint[](nodeIndexes[msg.sender].numberOfNodes);
        uint indexOfActiveNodesByAddress = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (nodeIndexes[msg.sender].isNodeExist[indexOfNodes] && isNodeActive(indexOfNodes)) {
                activeNodesByAddress[indexOfActiveNodesByAddress] = indexOfNodes;
                indexOfActiveNodesByAddress++;
            }
        }
    }

    /**
     * @dev Return active node IDs.
     */
    function getActiveNodeIds() external view returns (uint[] memory activeNodeIds) {
        activeNodeIds = new uint[](numberOfActiveNodes);
        uint indexOfActiveNodeIds = 0;
        for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
            if (isNodeActive(indexOfNodes)) {
                activeNodeIds[indexOfActiveNodeIds] = indexOfNodes;
                indexOfActiveNodeIds++;
            }
        }
    }

    /**
     * @dev Return validator ID linked to a given node.
     *
     * Requirements:
     *
     * - Node must exist.
     */
    function getValidatorId(uint nodeIndex) external view returns (uint) {
        require(nodeIndex < nodes.length, "Node does not exist");
        return nodes[nodeIndex].validatorId;
    }

    /**
     * @dev Return a given node's current status.
     */
    function getNodeStatus(uint nodeIndex) external view returns (NodeStatus) {
        return nodes[nodeIndex].status;
    }

    /**
     * @dev Return a validator's linked nodes.
     *
     * Requirements:
     *
     * - Validator ID must exist.
     */
    function getValidatorNodeIndexes(uint validatorId) external view returns (uint[] memory) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        return validatorToNodeIndexes[validatorId];
    }

    /**
     * @dev constructor in Permissions approach.
    */
    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);

        numberOfActiveNodes = 0;
        numberOfLeavingNodes = 0;
        numberOfLeftNodes = 0;
    }

    /**
     * @dev Checks whether a node's status is Active.
     */
    function isNodeActive(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Active;
    }

    /**
     * @dev Checks whether a node's status is Leaving.
     */
    function isNodeLeaving(uint nodeIndex) public view returns (bool) {
        return nodes[nodeIndex].status == NodeStatus.Leaving;
    }

    /**
     * @dev Returns number of nodes with free space.
     */
    function countNodesWithFreeSpace(uint8 freeSpace) public view returns (uint count) {
        count = 0;
        for (uint8 i = freeSpace; i <= 128; ++i) {
            count = count.add(spaceToNodes[i].length);
        }
    }

    /**
     * @dev Returns the index of a given node within the validator's node index.
     */
    function _findNode(uint[] memory validatorNodeIndexes, uint nodeIndex) private pure returns (uint) {
        uint i;
        for (i = 0; i < validatorNodeIndexes.length; i++) {
            if (validatorNodeIndexes[i] == nodeIndex) {
                return i;
            }
        }
        return i;
    }

    /**
     * @dev Moves a node to a new space mapping.
     */
    function _moveNodeToNewSpaceMap(uint nodeIndex, uint8 newSpace) private {
        uint8 previousSpace = spaceOfNodes[nodeIndex].freeSpace;
        uint indexInArray = spaceOfNodes[nodeIndex].indexInSpaceMap;
        if (indexInArray < spaceToNodes[previousSpace].length.sub(1)) {
            uint shiftedIndex = spaceToNodes[previousSpace][spaceToNodes[previousSpace].length.sub(1)];
            spaceToNodes[previousSpace][indexInArray] = shiftedIndex;
            spaceOfNodes[shiftedIndex].indexInSpaceMap = indexInArray;
            spaceToNodes[previousSpace].pop();
        } else {
            spaceToNodes[previousSpace].pop();
        }
        spaceToNodes[newSpace].push(nodeIndex);
        spaceOfNodes[nodeIndex].freeSpace = newSpace;
        spaceOfNodes[nodeIndex].indexInSpaceMap = spaceToNodes[newSpace].length.sub(1);
    }

    /**
     * @dev Change a node's status to Left.
     */
    function _setNodeLeft(uint nodeIndex) private {
        nodesIPCheck[nodes[nodeIndex].ip] = false;
        nodesNameCheck[keccak256(abi.encodePacked(nodes[nodeIndex].name))] = false;
        delete nodesNameToIndex[keccak256(abi.encodePacked(nodes[nodeIndex].name))];
        if (nodes[nodeIndex].status == NodeStatus.Active) {
            numberOfActiveNodes--;
        } else {
            numberOfLeavingNodes--;
        }
        nodes[nodeIndex].status = NodeStatus.Left;
        numberOfLeftNodes++;
    }

    /**
     * @dev Change a node's status to Leaving.
     */
    function _setNodeLeaving(uint nodeIndex) private {
        nodes[nodeIndex].status = NodeStatus.Leaving;
        numberOfActiveNodes--;
        numberOfLeavingNodes++;
    }

    /**
     * @dev Adds node to array.
     */
    function _addNode(
        address from,
        string memory name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        bytes32[2] memory publicKey,
        uint validatorId
    )
        private
        returns (uint nodeIndex)
    {
        nodes.push(Node({
            name: name,
            ip: ip,
            publicIP: publicIP,
            port: port,
            //owner: from,
            publicKey: publicKey,
            startBlock: block.number,
            lastRewardDate: uint32(block.timestamp),
            finishTime: 0,
            status: NodeStatus.Active,
            validatorId: validatorId
        }));
        nodeIndex = nodes.length.sub(1);
        validatorToNodeIndexes[validatorId].push(nodeIndex);
        bytes32 nodeId = keccak256(abi.encodePacked(name));
        nodesIPCheck[ip] = true;
        nodesNameCheck[nodeId] = true;
        nodesNameToIndex[nodeId] = nodeIndex;
        nodeIndexes[from].isNodeExist[nodeIndex] = true;
        nodeIndexes[from].numberOfNodes++;
        spaceOfNodes.push(SpaceManaging({
            freeSpace: 128,
            indexInSpaceMap: spaceToNodes[128].length
        }));
        spaceToNodes[128].push(nodeIndex);
        numberOfActiveNodes++;
    }

    /**
     * @dev Deletes node from array.
     */
    function _deleteNode(uint nodeIndex) private {
        uint8 space = spaceOfNodes[nodeIndex].freeSpace;
        uint indexInArray = spaceOfNodes[nodeIndex].indexInSpaceMap;
        if (indexInArray < spaceToNodes[space].length.sub(1)) {
            uint shiftedIndex = spaceToNodes[space][spaceToNodes[space].length.sub(1)];
            spaceToNodes[space][indexInArray] = shiftedIndex;
            spaceOfNodes[shiftedIndex].indexInSpaceMap = indexInArray;
            spaceToNodes[space].pop();
        } else {
            spaceToNodes[space].pop();
        }
        delete spaceOfNodes[nodeIndex].freeSpace;
        delete spaceOfNodes[nodeIndex].indexInSpaceMap;
    }

}
