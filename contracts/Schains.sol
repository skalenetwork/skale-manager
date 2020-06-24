// SPDX-License-Identifier: AGPL-3.0-only

/*
    Schains.sol - SKALE Manager
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

pragma solidity 0.6.10;
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./SchainsInternal.sol";
import "./ConstantsHolder.sol";
import "./SkaleVerifier.sol";
import "./utils/FieldOperations.sol";

/**
 * @title Schains
 * @dev Contains functions to manage Schains such as Schain creation,
 * deletion, and rotation.
 */
contract Schains is Permissions {
    using StringUtils for string;
    using StringUtils for uint;

    struct SchainParameters {
        uint lifetime;
        uint8 typeOfSchain;
        uint16 nonce;
        string name;
    }

    /**
     * @dev Emitted when an schain is created.
     */
    event SchainCreated(
        string name,
        address owner,
        uint partOfNode,
        uint lifetime,
        uint numberOfNodes,
        uint deposit,
        uint16 nonce,
        bytes32 schainId,
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev Emitted when an schain is deleted.
     */
    event SchainDeleted(
        address owner,
        string name,
        bytes32 indexed schainId
    );

    /**
     * @dev Emitted when a node in an schain is rotated.
     */
    event NodeRotated(
        bytes32 schainId,
        uint oldNode,
        uint newNode
    );

    /**
     * @dev Emitted when a node is added to an schain.
     */
    event NodeAdded(
        bytes32 schainId,
        uint newNode
    );

    /**
     * @dev Emitted when a group of nodes is created for an schain.
     */
    event SchainNodes(
        string name,
        bytes32 schainId,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    bytes32 public constant SCHAIN_CREATOR_ROLE = keccak256("SCHAIN_CREATOR_ROLE");

    /**
     * @dev Allows SkaleManager contract to create an Schain.
     *
     * Emits SchainCreated event.
     *
     * Requirements:
     *
     * - Schain type is valid.
     * - There is sufficient deposit to create type of schain.
     */
    function addSchain(address from, uint deposit, bytes calldata data) external allow("SkaleManager") {
        SchainParameters memory schainParameters = _fallbackSchainParametersDataConverter(data);
        
        require(
            getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime) <= deposit,
            "Not enough money to create Schain");

        _addSchain(from, deposit, schainParameters);
    }

    function addSchainByFoundation(
        uint lifetime,
        uint8 typeOfSchain,
        uint16 nonce,
        string calldata name
    )
        external
    {
        require(hasRole(SCHAIN_CREATOR_ROLE, msg.sender), "Sender is not authorized to create schian");

        SchainParameters memory schainParameters = SchainParameters({
            lifetime: lifetime,
            typeOfSchain: typeOfSchain,
            nonce: nonce,
            name: name
        });

        _addSchain(msg.sender, 0, schainParameters);
    }

    /**
     * @dev Allows SkaleManager to remove an schain from the network.
     * Upon removal, the space availability of each node is updated.
     *
     * Emits SchainDeleted event.
     *
     * Requirements:
     *
     * - Executed by schain owner.
     */
    function deleteSchain(address from, string calldata name) external allow("SkaleManager") {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract("SchainsInternal");
        require(
            SchainsInternal(dataAddress).isOwnerAddress(from, schainId), 
            "Message sender is not the owner of the Schain"
        );
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        address nodesAddress = contractManager.getContract("Nodes");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = SchainsInternal(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsInternal(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = schainsInternal.findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsInternal(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            schainsInternal.removeNodeFromSchain(nodesInGroup[i], schainId);
            schainsInternal.removeNodeFromExceptions(schainId, nodesInGroup[i]);
            if (!Nodes(nodesAddress).isNodeLeft(nodesInGroup[i])) {
                _addSpace(nodesInGroup[i], partOfNode);
            }
        }
        schainsInternal.deleteGroup(schainId);
        SchainsInternal(dataAddress).removeSchain(schainId, from);
        SchainsInternal(dataAddress).removeRotation(schainId);
        emit SchainDeleted(from, name, schainId);
    }

    /**
     * @dev Allows SkaleManager to delete a root owned schain.
     * Upon removal, the space availability of each node is updated.
     *
     * Emits SchainDeleted event.
     *
     * Requirements:
     *
     * - Schain exists.
     */
    function deleteSchainByRoot(string calldata name) external allow("SkaleManager") {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract("SchainsInternal");
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal"));
        require(SchainsInternal(dataAddress).isSchainExist(schainId), "Schain does not exist");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = SchainsInternal(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsInternal(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = schainsInternal.findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsInternal(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            schainsInternal.removeNodeFromSchain(nodesInGroup[i], schainId);
            schainsInternal.removeNodeFromExceptions(schainId, nodesInGroup[i]);
            _addSpace(nodesInGroup[i], partOfNode);
        }
        schainsInternal.deleteGroup(schainId);
        address from = SchainsInternal(dataAddress).getSchainOwner(schainId);
        SchainsInternal(dataAddress).removeSchain(schainId, from);
        SchainsInternal(dataAddress).removeRotation(schainId);
        emit SchainDeleted(from, name, schainId);
    }

    /**
     * @dev Allows SkaleManager to rotate a node in an schain.
     *
     * Returns a boolean whether rotation is successful.
     *
     * Requirements:
     *
     * - A free node for rotating in.
     */
    function exitFromSchain(uint nodeIndex) external allow("SkaleManager") returns (bool) {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32 schainId = schainsInternal.getActiveSchain(nodeIndex);
        require(_checkRotation(schainId), "No free Nodes for rotating");
        uint newNodeIndex = rotateNode(nodeIndex, schainId);
        schainsInternal.finishRotation(schainId, nodeIndex, newNodeIndex);
        return schainsInternal.getActiveSchain(nodeIndex) == bytes32(0) ? true : false;
    }

    /**
     * @dev Allows SkaleManager to freeze schains, meaning node rotation is paused
     * until further TODO???.
     */
    function freezeSchains(uint nodeIndex) external allow("SkaleManager") {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32[] memory schains = schainsInternal.getActiveSchains(nodeIndex);
        for (uint i = 0; i < schains.length; i++) {
            SchainsInternal.Rotation memory rotation = schainsInternal.getRotation(schains[i]);
            if (rotation.nodeIndex == nodeIndex && now < rotation.freezeUntil) {
                continue;
            }
            string memory schainName = schainsInternal.getSchainName(schains[i]);
            string memory revertMessage = "Node cannot rotate on Schain ";
            revertMessage = revertMessage.strConcat(schainName);
            revertMessage = revertMessage.strConcat(", occupied by Node ");
            revertMessage = revertMessage.strConcat(rotation.nodeIndex.uint2str());
            string memory dkgRevert = "DKG process did not complete on schain ";
            require(
                !schainsInternal.isGroupFailedDKG(keccak256(abi.encodePacked(schainName))),
                dkgRevert.strConcat(schainName));
            require(rotation.freezeUntil < now, revertMessage);
            schainsInternal.startRotation(schains[i], nodeIndex);
        }
    }

    /**
     * @dev Allows SkaleManager to restart schain creation by forming a new node
     * group.
     *
     * Requirements:
     *
     * TODO
     */
    function restartSchainCreation(string calldata name) external allow("SkaleManager") {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract("SchainsInternal");
        require(SchainsInternal(dataAddress).isGroupFailedDKG(schainId), "DKG success");
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isAnyFreeNode(schainId), "No free Nodes for new group formation");
        uint newNodeIndex = _selectNodeToGroup(schainId);
        emit NodeAdded(schainId, newNodeIndex);
    }

    /**
     * @dev Checks whether schian group signature is valid.
     * TODO
     */
    function verifySchainSignature(
        uint signatureA,
        uint signatureB,
        bytes32 hash,
        uint counter,
        uint hashA,
        uint hashB,
        string calldata schainName
    )
        external
        view
        returns (bool)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        SkaleVerifier skaleVerifier = SkaleVerifier(contractManager.getContract("SkaleVerifier"));

        G2Operations.G2Point memory publicKey = schainsInternal.getGroupsPublicKey(
            keccak256(abi.encodePacked(schainName))
        );
        return skaleVerifier.verify(
            Fp2Operations.Fp2Point({
                a: signatureA,
                b: signatureB
            }),
            hash, counter,
            hashA, hashB,
            publicKey
        );
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
     * @dev Allows SkaleDKG and SkaleManager contracts to rotate a node
     * TODO fix
     * Returns a boolean whether the verification is successful.
     */
    function rotateNode(
        uint nodeIndex,
        bytes32 schainId
    )
        public
        allowTwo("SkaleDKG", "SkaleManager")
        returns (uint)
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        schainsInternal.removeNodeFromSchain(nodeIndex, schainId);
        return _selectNodeToGroup(schainId);
    }

    /**
     * @dev Returns the current price in SKL tokens for given Schain type and lifetime.
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        uint nodeDeposit = constantsHolder.NODE_DEPOSIT();
        uint numberOfNodes;
        uint8 divisor;
        (numberOfNodes, divisor) = getNodesDataFromTypeOfSchain(typeOfSchain);
        if (divisor == 0) {
            return 1e18;
        } else {
            uint up = nodeDeposit.mul(numberOfNodes.mul(lifetime.mul(2)));
            uint down = uint(
                uint(constantsHolder.TINY_DIVISOR())
                    .mul(uint(constantsHolder.SECONDS_TO_YEAR()))
                    .div(divisor)
            );
            return up.div(down);
        }
    }

    /**
     * @dev Returns the number of Nodes and resource divisor that is needed for a
     * given Schain type.
     */
    function getNodesDataFromTypeOfSchain(uint typeOfSchain)
        public
        view
        returns (uint numberOfNodes, uint8 partOfNode)
    {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_SCHAIN();
        if (typeOfSchain == 1) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.TINY_DIVISOR();
        } else if (typeOfSchain == 2) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.SMALL_DIVISOR();
        } else if (typeOfSchain == 3) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.MEDIUM_DIVISOR();
        } else if (typeOfSchain == 4) {
            partOfNode = 0;
            numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_TEST_SCHAIN();
        } else if (typeOfSchain == 5) {
            partOfNode = constantsHolder.TINY_DIVISOR() / constantsHolder.MEDIUM_TEST_DIVISOR();
            numberOfNodes = constantsHolder.NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN();
        } else {
            revert("Bad schain type");
        }
    }

    /**
     * @dev Initializes an schain in the SchainsInternal contract.
     *
     * Requirements:
     *
     * - Schain name is not already in use.
     */
    function _initializeSchainInSchainsInternal(
        string memory name,
        address from,
        uint deposit,
        uint lifetime) private
    {
        address dataAddress = contractManager.getContract("SchainsInternal");
        require(SchainsInternal(dataAddress).isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        SchainsInternal(dataAddress).initializeSchain(
            name,
            from,
            lifetime,
            deposit);
        SchainsInternal(dataAddress).setSchainIndex(keccak256(abi.encodePacked(name)), from);
    }

    /**
     * @dev Converts data from bytes to normal schain parameters of lifetime,
     * type, nonce, and name.
     */
    function _fallbackSchainParametersDataConverter(bytes memory data)
        private
        pure
        returns (SchainParameters memory schainParameters)
    {
        (schainParameters.lifetime,
        schainParameters.typeOfSchain,
        schainParameters.nonce,
        schainParameters.name) = abi.decode(data, (uint, uint8, uint16, string));
    }

    /**
     * @dev Frees previously occupied space in Node.
     */
    function _addSpace(uint nodeIndex, uint8 partOfNode) private {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        nodes.addSpaceToNode(nodeIndex, partOfNode);
    }

    /**
     * @dev Allows SkaleManager to create group of nodes for Schain.
     *
     * Emits SchainNodes event.
     */
    function _createGroupForSchain(
        string memory schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint8 partOfNode
    )
        private
        allow("SkaleManager")
    {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        uint[] memory nodesInGroup = schainsInternal.createGroupForSchain(schainId, numberOfNodes, partOfNode);
        schainsInternal.redirectOpenChannel(schainId);

        emit SchainNodes(
            schainName,
            schainId,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev Selects a node pseudo-randomly for a Schain.
     *
     * Requirements:
     *
     * - Schain must be in active state.
     * - Must be sufficiently available nodes for rotation.
     * - Must be able to allocate required resource from the node.
     */
    function _selectNodeToGroup(bytes32 schainId) private returns (uint) {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        require(schainsInternal.isSchainActive(schainId), "Group is not active");
        uint8 space = schainsInternal.getSchainsPartOfNode(schainId);
        uint[] memory possibleNodes = schainsInternal.isEnoughNodes(schainId);
        require(possibleNodes.length > 0, "No free Nodes for rotation");
        uint nodeIndex;
        uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), schainId)));
        do {
            uint index = random % possibleNodes.length;
            nodeIndex = possibleNodes[index];
            random = uint(keccak256(abi.encodePacked(random, nodeIndex)));
        } while (schainsInternal.checkException(schainId, nodeIndex));
        require(nodes.removeSpaceFromNode(nodeIndex, space), "Could not remove space from nodeIndex");
        schainsInternal.addSchainForNode(nodeIndex, schainId);
        schainsInternal.setException(schainId, nodeIndex);
        schainsInternal.setNodeInGroup(schainId, nodeIndex);
        return nodeIndex;
    }

    /**
     * @dev Checks whether there are
     * TODO
     */
    function _checkRotation(bytes32 schainId ) private view returns (bool) {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isSchainExist(schainId), "Schain does not exist");
        return schainsInternal.isAnyFreeNode(schainId);
    }

    /**
     * @dev _addSchain - create Schain in the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param deposit - received amoung of SKL
     * @param schainParameters - Schain's data
     */
    function _addSchain(address from, uint deposit, SchainParameters memory schainParameters) private {
        uint numberOfNodes;
        uint8 partOfNode;

        require(schainParameters.typeOfSchain <= 5, "Invalid type of Schain");

        //initialize Schain
        _initializeSchainInSchainsInternal(
            schainParameters.name,
            from,
            deposit,
            schainParameters.lifetime);

        // create a group for Schain
        (numberOfNodes, partOfNode) = getNodesDataFromTypeOfSchain(schainParameters.typeOfSchain);

        _createGroupForSchain(
            schainParameters.name,
            keccak256(abi.encodePacked(schainParameters.name)),
            numberOfNodes,
            partOfNode
        );

        emit SchainCreated(
            schainParameters.name,
            from,
            partOfNode,
            schainParameters.lifetime,
            numberOfNodes,
            deposit,
            schainParameters.nonce,
            keccak256(abi.encodePacked(schainParameters.name)),
            uint32(block.timestamp),
            gasleft());
    }
}
