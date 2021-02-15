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

import "@openzeppelin/contracts-ethereum-package/contracts/utils/SafeCast.sol";

import "./delegation/DelegationController.sol";
import "./delegation/ValidatorService.sol";
import "./utils/Random.sol";
import "./utils/SegmentTree.sol";

import "./BountyV2.sol";
import "./ConstantsHolder.sol";
import "./Permissions.sol";


/**
 * @title Nodes
 * @dev This contract contains all logic to manage SKALE Network nodes states,
 * space availability, stake requirement checks, and exit functions.
 * 
 * Nodes may be in one of several states:
 * 
 * - Active:            Node is registered and is in network operation.
 * - Leaving:           Node has begun exiting from the network.
 * - Left:              Node has left the network.
 * - In_Maintenance:    Node is temporarily offline or undergoing infrastructure
 * maintenance
 * 
 * Note: Online nodes contain both Active and Leaving states.
 */
contract Nodes is Permissions {
    
    using Random for Random.RandomGenerator;
    using SafeCast for uint;
    using SegmentTree for SegmentTree.Tree;

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

    // TODO: move outside the contract
    struct NodeCreationParams {
        string name;
        bytes4 ip;
        bytes4 publicIp;
        uint16 port;
        bytes32[2] publicKey;
        uint16 nonce;
        string domainName;
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

    mapping (uint => string) public domainNames;

    mapping (uint => bool) private _invisible;

    SegmentTree.Tree internal _nodesAmountBySpace;

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
        string domainName,
        uint time,
        uint gasSpend
    );

    /**
     * @dev Emitted when a node completes a network exit.
     */
    event ExitCompleted(
        uint nodeIndex,
        uint time,
        uint gasSpend
    );

    /**
     * @dev Emitted when a node begins to exit from the network.
     */
    event ExitInitialized(
        uint nodeIndex,
        uint startLeavingPeriod,
        uint time,
        uint gasSpend
    );

    modifier checkNodeExists(uint nodeIndex) {
        _checkNodeIndex(nodeIndex);
        _;
    }

    modifier onlyNodeOrAdmin(uint nodeIndex) {
        _checkNodeOrAdmin(nodeIndex, msg.sender);
        _;
    }

    function initializeSegmentTreeAndInvisibleNodes() external onlyOwner {
        for (uint i = 0; i < nodes.length; i++) {
            if (nodes[i].status != NodeStatus.Active && nodes[i].status != NodeStatus.Left) {
                _invisible[i] = true;
                _removeNodeFromSpaceToNodes(i, spaceOfNodes[i].freeSpace);
            }
        }
        uint8 totalSpace = ConstantsHolder(contractManager.getContract("ConstantsHolder")).TOTAL_SPACE_ON_NODE();
        _nodesAmountBySpace.create(totalSpace);
        for (uint8 i = 1; i <= totalSpace; i++) {
            if (spaceToNodes[i].length > 0)
                _nodesAmountBySpace.addToPlace(i, spaceToNodes[i].length);
        }
    }

    /**
     * @dev Allows Schains and SchainsInternal contracts to occupy available
     * space on a node.
     * 
     * Returns whether operation is successful.
     */
    function removeSpaceFromNode(uint nodeIndex, uint8 space)
        external
        checkNodeExists(nodeIndex)
        allowTwo("NodeRotation", "SchainsInternal")
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
     * @dev Allows Schains contract to occupy free space on a node.
     * 
     * Returns whether operation is successful.
     */
    function addSpaceToNode(uint nodeIndex, uint8 space)
        external
        checkNodeExists(nodeIndex)
        allowTwo("Schains", "NodeRotation")
    {
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
    function changeNodeLastRewardDate(uint nodeIndex)
        external
        checkNodeExists(nodeIndex)
        allow("SkaleManager")
    {
        nodes[nodeIndex].lastRewardDate = block.timestamp;
    }

    /**
     * @dev Allows SkaleManager to change a node's finish time.
     */
    function changeNodeFinishTime(uint nodeIndex, uint time)
        external
        checkNodeExists(nodeIndex)
        allow("SkaleManager")
    {
        nodes[nodeIndex].finishTime = time;
    }

    /**
     * @dev Allows SkaleManager contract to create new node and add it to the
     * Nodes contract.
     * 
     * Emits a {NodeCreated} event.
     * 
     * Requirements:
     * 
     * - Node IP must be non-zero.
     * - Node IP must be available.
     * - Node name must not already be registered.
     * - Node port must be greater than zero.
     */
    function createNode(address from, NodeCreationParams calldata params)
        external
        allow("SkaleManager")
    {
        // checks that Node has correct data
        require(params.ip != 0x0 && !nodesIPCheck[params.ip], "IP address is zero or is not available");
        require(!nodesNameCheck[keccak256(abi.encodePacked(params.name))], "Name is already registered");
        require(params.port > 0, "Port is zero");
        require(from == _publicKeyToAddress(params.publicKey), "Public Key is incorrect");
        uint validatorId = ValidatorService(
            contractManager.getContract("ValidatorService")).getValidatorIdByNodeAddress(from);
        uint8 totalSpace = ConstantsHolder(contractManager.getContract("ConstantsHolder")).TOTAL_SPACE_ON_NODE();
        nodes.push(Node({
            name: params.name,
            ip: params.ip,
            publicIP: params.publicIp,
            port: params.port,
            publicKey: params.publicKey,
            startBlock: block.number,
            lastRewardDate: block.timestamp,
            finishTime: 0,
            status: NodeStatus.Active,
            validatorId: validatorId
        }));
        uint nodeIndex = nodes.length.sub(1);
        validatorToNodeIndexes[validatorId].push(nodeIndex);
        bytes32 nodeId = keccak256(abi.encodePacked(params.name));
        nodesIPCheck[params.ip] = true;
        nodesNameCheck[nodeId] = true;
        nodesNameToIndex[nodeId] = nodeIndex;
        nodeIndexes[from].isNodeExist[nodeIndex] = true;
        nodeIndexes[from].numberOfNodes++;
        domainNames[nodeIndex] = params.domainName;
        spaceOfNodes.push(SpaceManaging({
            freeSpace: totalSpace,
            indexInSpaceMap: spaceToNodes[totalSpace].length
        }));
        _setNodeActive(nodeIndex);
        emit NodeCreated(
            nodeIndex,
            from,
            params.name,
            params.ip,
            params.publicIp,
            params.port,
            params.nonce,
            params.domainName,
            block.timestamp,
            gasleft());
    }

    /**
     * @dev Allows SkaleManager contract to initiate a node exit procedure.
     * 
     * Returns whether the operation is successful.
     * 
     * Emits an {ExitInitialized} event.
     */
    function initExit(uint nodeIndex)
        external
        checkNodeExists(nodeIndex)
        allow("SkaleManager")
        returns (bool)
    {
        require(isNodeActive(nodeIndex), "Node should be Active");
    
        _setNodeLeaving(nodeIndex);

        emit ExitInitialized(
            nodeIndex,
            block.timestamp,
            block.timestamp,
            gasleft());
        return true;
    }

    /**
     * @dev Allows SkaleManager contract to complete a node exit procedure.
     * 
     * Returns whether the operation is successful.
     * 
     * Emits an {ExitCompleted} event.
     * 
     * Requirements:
     * 
     * - Node must have already initialized a node exit procedure.
     */
    function completeExit(uint nodeIndex)
        external
        checkNodeExists(nodeIndex)
        allow("SkaleManager")
        returns (bool)
    {
        require(isNodeLeaving(nodeIndex), "Node is not Leaving");

        _setNodeLeft(nodeIndex);

        emit ExitCompleted(
            nodeIndex,
            block.timestamp,
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
    function deleteNodeForValidator(uint validatorId, uint nodeIndex)
        external
        checkNodeExists(nodeIndex)
        allow("SkaleManager")
    {
        ValidatorService validatorService = ValidatorService(contractManager.getValidatorService());
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        uint[] memory validatorNodes = validatorToNodeIndexes[validatorId];
        uint position = _findNode(validatorNodes, nodeIndex);
        if (position < validatorNodes.length) {
            validatorToNodeIndexes[validatorId][position] =
                validatorToNodeIndexes[validatorId][validatorNodes.length.sub(1)];
        }
        validatorToNodeIndexes[validatorId].pop();
        address nodeOwner = _publicKeyToAddress(nodes[nodeIndex].publicKey);
        if (validatorService.getValidatorIdByNodeAddress(nodeOwner) == validatorId) {
            if (nodeIndexes[nodeOwner].numberOfNodes == 1 && !validatorService.validatorAddressExists(nodeOwner)) {
                validatorService.removeNodeAddress(validatorId, nodeOwner);
            }
            nodeIndexes[nodeOwner].isNodeExist[nodeIndex] = false;
            nodeIndexes[nodeOwner].numberOfNodes--;
        }
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
        ValidatorService validatorService = ValidatorService(contractManager.getValidatorService());
        uint validatorId = validatorService.getValidatorIdByNodeAddress(nodeAddress);
        require(validatorService.isAuthorizedValidator(validatorId), "Validator is not authorized to create a node");
        require(
            _checkValidatorPositionToMaintainNode(validatorId, validatorToNodeIndexes[validatorId].length),
            "Validator must meet the Minimum Staking Requirement");
    }

    /**
     * @dev Allows SkaleManager contract to check whether a validator has
     * sufficient stake to maintain a node.
     * 
     * Returns whether validator can maintain node with current stake.
     * 
     * Requirements:
     * 
     * - Validator ID and nodeIndex must both exist.
     */
    function checkPossibilityToMaintainNode(
        uint validatorId,
        uint nodeIndex
    )
        external
        checkNodeExists(nodeIndex)
        allow("Bounty")
        returns (bool)
    {
        ValidatorService validatorService = ValidatorService(contractManager.getValidatorService());
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        uint[] memory validatorNodes = validatorToNodeIndexes[validatorId];
        uint position = _findNode(validatorNodes, nodeIndex);
        require(position < validatorNodes.length, "Node does not exist for this Validator");
        return _checkValidatorPositionToMaintainNode(validatorId, position);
    }

    /**
     * @dev Allows Node to set In_Maintenance status.
     * 
     * Requirements:
     * 
     * - Node must already be Active.
     * - `msg.sender` must be owner of Node, validator, or SkaleManager.
     */
    function setNodeInMaintenance(uint nodeIndex) external onlyNodeOrAdmin(nodeIndex) {
        require(nodes[nodeIndex].status == NodeStatus.Active, "Node is not Active");
        _setNodeInMaintenance(nodeIndex);
    }

    /**
     * @dev Allows Node to remove In_Maintenance status.
     * 
     * Requirements:
     * 
     * - Node must already be In Maintenance.
     * - `msg.sender` must be owner of Node, validator, or SkaleManager.
     */
    function removeNodeFromInMaintenance(uint nodeIndex) external onlyNodeOrAdmin(nodeIndex) {
        require(nodes[nodeIndex].status == NodeStatus.In_Maintenance, "Node is not In Maintenance");
        _setNodeActive(nodeIndex);
    }

    function setDomainName(uint nodeIndex, string memory domainName)
        external
        onlyNodeOrAdmin(nodeIndex)
    {
        domainNames[nodeIndex] = domainName;
    }
    
    function makeNodeVisible(uint nodeIndex) external allow("SchainsInternal") {
        _makeNodeVisible(nodeIndex);
    }

    function makeNodeInvisible(uint nodeIndex) external allow("SchainsInternal") {
        _makeNodeInvisible(nodeIndex);
    }

    function getRandomNodeWithFreeSpace(
        uint8 freeSpace,
        Random.RandomGenerator memory randomGenerator
    )
        external
        view
        returns (uint)
    {
        uint8 place = _nodesAmountBySpace.getRandomNonZeroElementFromPlaceToLast(
            freeSpace == 0 ? 1 : freeSpace,
            randomGenerator
        ).toUint8();
        require(place > 0, "Node not found");
        return spaceToNodes[place][randomGenerator.random(spaceToNodes[place].length)]; 
    }

    /**
     * @dev Checks whether it is time for a node's reward.
     */
    function isTimeForReward(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return BountyV2(contractManager.getBounty()).getNextRewardTimestamp(nodeIndex) <= now;
    }

    /**
     * @dev Returns IP address of a given node.
     * 
     * Requirements:
     * 
     * - Node must exist.
     */
    function getNodeIP(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (bytes4)
    {
        require(nodeIndex < nodes.length, "Node does not exist");
        return nodes[nodeIndex].ip;
    }

    /**
     * @dev Returns domain name of a given node.
     * 
     * Requirements:
     * 
     * - Node must exist.
     */
    function getNodeDomainName(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (string memory)
    {
        return domainNames[nodeIndex];
    }

    /**
     * @dev Returns the port of a given node.
     *
     * Requirements:
     *
     * - Node must exist.
     */
    function getNodePort(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (uint16)
    {
        return nodes[nodeIndex].port;
    }

    /**
     * @dev Returns the public key of a given node.
     */
    function getNodePublicKey(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (bytes32[2] memory)
    {
        return nodes[nodeIndex].publicKey;
    }

    /**
     * @dev Returns an address of a given node.
     */
    function getNodeAddress(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (address)
    {
        return _publicKeyToAddress(nodes[nodeIndex].publicKey);
    }


    /**
     * @dev Returns the finish exit time of a given node.
     */
    function getNodeFinishTime(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (uint)
    {
        return nodes[nodeIndex].finishTime;
    }

    /**
     * @dev Checks whether a node has left the network.
     */
    function isNodeLeft(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return nodes[nodeIndex].status == NodeStatus.Left;
    }

    function isNodeInMaintenance(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return nodes[nodeIndex].status == NodeStatus.In_Maintenance;
    }

    /**
     * @dev Returns a given node's last reward date.
     */
    function getNodeLastRewardDate(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (uint)
    {
        return nodes[nodeIndex].lastRewardDate;
    }

    /**
     * @dev Returns a given node's next reward date.
     */
    function getNodeNextRewardDate(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (uint)
    {
        return BountyV2(contractManager.getBounty()).getNextRewardTimestamp(nodeIndex);
    }

    /**
     * @dev Returns the total number of registered nodes.
     */
    function getNumberOfNodes() external view returns (uint) {
        return nodes.length;
    }

    /**
     * @dev Returns the total number of online nodes.
     * 
     * Note: Online nodes are equal to the number of active plus leaving nodes.
     */
    function getNumberOnlineNodes() external view returns (uint) {
        return numberOfActiveNodes.add(numberOfLeavingNodes);
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
     * @dev Return a given node's current status.
     */
    function getNodeStatus(uint nodeIndex)
        external
        view
        checkNodeExists(nodeIndex)
        returns (NodeStatus)
    {
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
        ValidatorService validatorService = ValidatorService(contractManager.getValidatorService());
        require(validatorService.validatorExists(validatorId), "Validator ID does not exist");
        return validatorToNodeIndexes[validatorId];
    }

    /**
     * @dev Returns number of nodes with available space.
     */
    function countNodesWithFreeSpace(uint8 freeSpace) external view returns (uint count) {
        if (freeSpace == 0) {
            return _nodesAmountBySpace.sumFromPlaceToLast(1);
        }
        return _nodesAmountBySpace.sumFromPlaceToLast(freeSpace);
    }

    /**
     * @dev constructor in Permissions approach.
     */
    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);

        numberOfActiveNodes = 0;
        numberOfLeavingNodes = 0;
        numberOfLeftNodes = 0;
        _nodesAmountBySpace.create(128);
    }

    /**
     * @dev Returns the Validator ID for a given node.
     */
    function getValidatorId(uint nodeIndex)
        public
        view
        checkNodeExists(nodeIndex)
        returns (uint)
    {
        return nodes[nodeIndex].validatorId;
    }

    /**
     * @dev Checks whether a node exists for a given address.
     */
    function isNodeExist(address from, uint nodeIndex)
        public
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return nodeIndexes[from].isNodeExist[nodeIndex];
    }

    /**
     * @dev Checks whether a node's status is Active.
     */
    function isNodeActive(uint nodeIndex)
        public
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return nodes[nodeIndex].status == NodeStatus.Active;
    }

    /**
     * @dev Checks whether a node's status is Leaving.
     */
    function isNodeLeaving(uint nodeIndex)
        public
        view
        checkNodeExists(nodeIndex)
        returns (bool)
    {
        return nodes[nodeIndex].status == NodeStatus.Leaving;
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
        return validatorNodeIndexes.length;
    }

    /**
     * @dev Moves a node to a new space mapping.
     */
    function _moveNodeToNewSpaceMap(uint nodeIndex, uint8 newSpace) private {
        if (!_invisible[nodeIndex]) {
            uint8 space = spaceOfNodes[nodeIndex].freeSpace;
            _removeNodeFromTree(space);
            _addNodeToTree(newSpace);
            _removeNodeFromSpaceToNodes(nodeIndex, space);
            _addNodeToSpaceToNodes(nodeIndex, newSpace);
        }
        spaceOfNodes[nodeIndex].freeSpace = newSpace;
    }

    /**
     * @dev Changes a node's status to Active.
     */
    function _setNodeActive(uint nodeIndex) private {
        nodes[nodeIndex].status = NodeStatus.Active;
        numberOfActiveNodes = numberOfActiveNodes.add(1);
        if (_invisible[nodeIndex]) {
            _makeNodeVisible(nodeIndex);
        } else {
            uint8 space = spaceOfNodes[nodeIndex].freeSpace;
            _addNodeToSpaceToNodes(nodeIndex, space);
            _addNodeToTree(space);
        }
    }

    /**
     * @dev Changes a node's status to In_Maintenance.
     */
    function _setNodeInMaintenance(uint nodeIndex) private {
        nodes[nodeIndex].status = NodeStatus.In_Maintenance;
        numberOfActiveNodes = numberOfActiveNodes.sub(1);
        _makeNodeInvisible(nodeIndex);
    }

    /**
     * @dev Changes a node's status to Left.
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
        delete spaceOfNodes[nodeIndex].freeSpace;
    }

    /**
     * @dev Changes a node's status to Leaving.
     */
    function _setNodeLeaving(uint nodeIndex) private {
        nodes[nodeIndex].status = NodeStatus.Leaving;
        numberOfActiveNodes--;
        numberOfLeavingNodes++;
        _makeNodeInvisible(nodeIndex);
    }

    function _makeNodeInvisible(uint nodeIndex) private {
        if (!_invisible[nodeIndex]) {
            uint8 space = spaceOfNodes[nodeIndex].freeSpace;
            _removeNodeFromSpaceToNodes(nodeIndex, space);
            _removeNodeFromTree(space);
            _invisible[nodeIndex] = true;
        }
    }

    function _makeNodeVisible(uint nodeIndex) private {
        if (_invisible[nodeIndex]) {
            uint8 space = spaceOfNodes[nodeIndex].freeSpace;
            _addNodeToSpaceToNodes(nodeIndex, space);
            _addNodeToTree(space);
            delete _invisible[nodeIndex];
        }
    }

    function _addNodeToSpaceToNodes(uint nodeIndex, uint8 space) private {
        spaceToNodes[space].push(nodeIndex);
        spaceOfNodes[nodeIndex].indexInSpaceMap = spaceToNodes[space].length.sub(1);
    }

    function _removeNodeFromSpaceToNodes(uint nodeIndex, uint8 space) internal {
        uint indexInArray = spaceOfNodes[nodeIndex].indexInSpaceMap;
        uint len = spaceToNodes[space].length.sub(1);
        if (indexInArray < len) {
            uint shiftedIndex = spaceToNodes[space][len];
            spaceToNodes[space][indexInArray] = shiftedIndex;
            spaceOfNodes[shiftedIndex].indexInSpaceMap = indexInArray;
        }
        spaceToNodes[space].pop();
        delete spaceOfNodes[nodeIndex].indexInSpaceMap;
    }

    function _addNodeToTree(uint8 space) private {
        if (space > 0) {
            _nodesAmountBySpace.addToPlace(space, 1);
        }
    }

    function _removeNodeFromTree(uint8 space) private {
        if (space > 0) {
            _nodesAmountBySpace.removeFromPlace(space, 1);
        }
    }

    function _checkValidatorPositionToMaintainNode(uint validatorId, uint position) private returns (bool) {
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        uint delegationsTotal = delegationController.getAndUpdateDelegatedToValidatorNow(validatorId);
        uint msr = ConstantsHolder(contractManager.getConstantsHolder()).msr();
        return position.add(1).mul(msr) <= delegationsTotal;
    }

    function _checkNodeIndex(uint nodeIndex) private view {
        require(nodeIndex < nodes.length, "Node with such index does not exist");
    }

    function _checkNodeOrAdmin(uint nodeIndex, address sender) private view {
        ValidatorService validatorService = ValidatorService(contractManager.getValidatorService());

        require(
            isNodeExist(sender, nodeIndex) ||
            _isAdmin(sender) ||
            getValidatorId(nodeIndex) == validatorService.getValidatorId(sender),
            "Sender is not permitted to call this function"
        );
    }

    function _publicKeyToAddress(bytes32[2] memory pubKey) private pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(pubKey[0], pubKey[1]));
        bytes20 addr;
        for (uint8 i = 12; i < 32; i++) {
            addr |= bytes20(hash[i] & 0xFF) >> ((i - 12) * 8);
        }
        return address(addr);
    }

    function _min(uint a, uint b) private pure returns (uint) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }
}
