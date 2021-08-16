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

import "@skalenetwork/skale-manager-interfaces/ISchains.sol";

import "./Permissions.sol";
import "./SchainsInternal.sol";
import "./ConstantsHolder.sol";
import "./KeyStorage.sol";
import "./SkaleVerifier.sol";
import "./utils/FieldOperations.sol";
import "./NodeRotation.sol";
import "./interfaces/ISkaleDKG.sol";
import "./Wallets.sol";
import "./SkaleToken.sol";

/**
 * @title Schains
 * @dev Contains functions to manage Schains such as Schain creation,
 * deletion, and rotation.
 */
contract Schains is Permissions, ISchains {

    struct SchainData {
        uint lifetime;
        uint8 typeOfSchain;
        uint16 nonce;
        string name;
    }

    bytes32 public constant SCHAIN_CREATOR_ROLE = keccak256("SCHAIN_CREATOR_ROLE");

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
        bytes32 schainHash
    );

    /**
     * @dev Emitted when an schain is deleted.
     */
    event SchainDeleted(
        address owner,
        string name,
        bytes32 indexed schainHash
    );

    /**
     * @dev Emitted when a node in an schain is rotated.
     */
    event NodeRotated(
        bytes32 schainHash,
        uint oldNode,
        uint newNode
    );

    /**
     * @dev Emitted when a node is added to an schain.
     */
    event NodeAdded(
        bytes32 schainHash,
        uint newNode
    );

    /**
     * @dev Emitted when a group of nodes is created for an schain.
     */
    event SchainNodes(
        string name,
        bytes32 schainHash,
        uint[] nodesInGroup
    );

    /**
     * @dev Allows SkaleManager contract to create an Schain.
     * 
     * Emits an {SchainCreated} event.
     * 
     * Requirements:
     * 
     * - Schain type is valid.
     * - There is sufficient deposit to create type of schain.
     */
    function addSchain(
        string memory schainName,
        uint deposit,
        uint8 typeOfSchain
    )
        external
        payable
    {
        bytes32 schainHash = keccak256(abi.encodePacked(schainName));
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        Wallets wallets = Wallets(payable(contractManager.getContract("Wallets")));
        require(
            skaleToken.transferFrom(msg.sender, address(wallets), deposit),
            "Approved amount of tokens is not enough"
        );
        wallets.storeSchainDeposit(schainHash, deposit);
        uint lifetime = calculateSchainLifeTime(deposit, constantsHolder.schainCostPerMonth());
        require(lifetime >= constantsHolder.minimalSchainLifetime(), "Schain lifetime is too short");
        _addSchain(msg.sender, schainName, deposit, typeOfSchain, lifetime);
        wallets.rechargeSchainWallet{value: msg.value}(schainHash);
    }

    /**
     * @dev Allows the foundation to create an Schain without tokens.
     * 
     * Emits an {SchainCreated} event.
     * 
     * Requirements:
     * 
     * - sender is granted with SCHAIN_CREATOR_ROLE
     * - Schain type is valid.
     */
    function addSchainByFoundation(
        string calldata name,
        address schainOwner,
        uint8 typeOfSchain,
        uint lifetime
    )
        external
        payable
    {
        require(hasRole(SCHAIN_CREATOR_ROLE, msg.sender), "Sender is not authorized to create schain");

        address _schainOwner = schainOwner != address(0) ? schainOwner : msg.sender;
        _addSchain(_schainOwner, name, 0, typeOfSchain, lifetime);
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        Wallets(payable(contractManager.getContract("Wallets"))).rechargeSchainWallet{value: msg.value}(schainHash);
    }

    /**
     * @dev Allows SkaleManager to remove an schain from the network.
     * Upon removal, the space availability of each node is updated.
     * 
     * Emits an {SchainDeleted} event.
     * 
     * Requirements:
     * 
     * - Executed by schain owner.
     */
    function deleteSchain(address from, string calldata name) external allow("SkaleManager") {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        require(
            schainsInternal.isOwnerAddress(from, schainHash),
            "Message sender is not the owner of the Schain"
        );

        _deleteSchain(name, schainsInternal);
    }

    /**
     * @dev Allows SkaleManager to delete any Schain.
     * Upon removal, the space availability of each node is updated.
     * 
     * Emits an {SchainDeleted} event.
     * 
     * Requirements:
     * 
     * - Schain exists.
     */
    function deleteSchainByRoot(string calldata name) external allow("SkaleManager") {
        _deleteSchain(name, SchainsInternal(contractManager.getContract("SchainsInternal")));
    }

    /**
     * @dev Allows SkaleManager contract to restart schain creation by forming a
     * new schain group. Executed when DKG procedure fails and becomes stuck.
     * 
     * Emits a {NodeAdded} event.
     * 
     * Requirements:
     * 
     * - Previous DKG procedure must have failed.
     * - DKG failure got stuck because there were no free nodes to rotate in.
     * - A free node must be released in the network.
     */
    function restartSchainCreation(string calldata name) external allow("SkaleManager") {
        NodeRotation nodeRotation = NodeRotation(contractManager.getContract("NodeRotation"));
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        require(!skaleDKG.isLastDKGSuccessful(schainHash), "DKG success");
        SchainsInternal schainsInternal = SchainsInternal(
            contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isAnyFreeNode(schainHash), "No free Nodes for new group formation");
        uint newNodeIndex = nodeRotation.selectNodeToGroup(schainHash);
        skaleDKG.openChannel(schainHash);
        emit NodeAdded(schainHash, newNodeIndex);
    }

    /**
     * @dev addSpace - return occupied space to Node
     * nodeIndex - index of Node at common array of Nodes
     * partOfNode - divisor of given type of Schain
     */
    function addSpace(uint nodeIndex, uint8 partOfNode) external allowTwo("Schains", "NodeRotation") {
        Nodes nodes = Nodes(contractManager.getContract("Nodes"));
        nodes.addSpaceToNode(nodeIndex, partOfNode);
    }

    /**
     * @dev Checks whether schain group signature is valid.
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
        override
        returns (bool)
    {
        SkaleVerifier skaleVerifier = SkaleVerifier(contractManager.getContract("SkaleVerifier"));
        G2Operations.G2Point memory publicKey = KeyStorage(
            contractManager.getContract("KeyStorage")
        ).getCommonPublicKey(
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

    function getSchainPrice(uint amountOfMonths) external view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        return amountOfMonths * constantsHolder.schainCostPerMonth();
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    function calculateSchainLifeTime(uint deposit, uint schainCostPerMonth) public returns (uint) {
        return deposit * 30 days / schainCostPerMonth;
    }

    // /**
    //  * @dev Returns the current price in SKL tokens for given Schain type and lifetime.
    //  */
    // function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
    //     ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getConstantsHolder());
    //     SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
    //     uint nodeDeposit = constantsHolder.NODE_DEPOSIT();
    //     uint numberOfNodes;
    //     uint8 divisor;
    //     (divisor, numberOfNodes) = schainsInternal.getSchainType(typeOfSchain);
    //     if (divisor == 0) {
    //         return 1e18;
    //     } else {
    //         uint up = nodeDeposit.mul(numberOfNodes.mul(lifetime.mul(2)));
    //         uint down = uint(
    //             uint(constantsHolder.SMALL_DIVISOR())
    //                 .mul(uint(constantsHolder.SECONDS_TO_YEAR()))
    //                 .div(divisor)
    //         );
    //         return up.div(down);
    //     }
    // }


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
        uint lifetime,
        SchainsInternal schainsInternal
    )
        private
    {
        require(schainsInternal.isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        schainsInternal.initializeSchain(name, from, lifetime, deposit);
        schainsInternal.setSchainIndex(keccak256(abi.encodePacked(name)), from);
    }

    /**
     * @dev Allows creation of node group for Schain.
     * 
     * Emits an {SchainNodes} event.
     */
    function _createGroupForSchain(
        string memory schainName,
        bytes32 schainHash,
        uint numberOfNodes,
        uint8 partOfNode,
        SchainsInternal schainsInternal
    )
        private
    {
        uint[] memory nodesInGroup = schainsInternal.createGroupForSchain(schainHash, numberOfNodes, partOfNode);
        ISkaleDKG(contractManager.getContract("SkaleDKG")).openChannel(schainHash);

        emit SchainNodes(
            schainName,
            schainHash,
            nodesInGroup);
    }

    /**
     * @dev Creates an schain.
     * 
     * Emits an {SchainCreated} event.
     * 
     * Requirements:
     * 
     * - Schain type must be valid.
     */
    function _addSchain(address from, string memory name, uint deposit, uint8 typeOfSchain, uint lifetime) private {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32 schainHash = keccak256(abi.encodePacked(name));

        //initialize Schain
        _initializeSchainInSchainsInternal(
            name,
            from,
            deposit,
            lifetime,
            schainsInternal
        );

        // create a group for Schain
        (uint8 partOfNode, uint numberOfNodes) = schainsInternal.getSchainType(typeOfSchain);

        _createGroupForSchain(
            name,
            schainHash,
            numberOfNodes,
            partOfNode,
            schainsInternal
        );

        emit SchainCreated(
            name,
            from,
            partOfNode,
            lifetime,
            numberOfNodes,
            deposit,
            schainHash);
    }

    function _deleteSchain(string calldata name, SchainsInternal schainsInternal) private {
        NodeRotation nodeRotation = NodeRotation(contractManager.getContract("NodeRotation"));

        bytes32 schainHash = keccak256(abi.encodePacked(name));
        require(schainsInternal.isSchainExist(schainHash), "Schain does not exist");

        uint[] memory nodesInGroup = schainsInternal.getNodesInGroup(schainHash);
        uint8 partOfNode = schainsInternal.getSchainsPartOfNode(schainHash);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = schainsInternal.findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainHash
            );
            if (schainsInternal.checkHoleForSchain(schainHash, i)) {
                continue;
            }
            require(
                schainIndex < schainsInternal.getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            schainsInternal.removeNodeFromSchain(nodesInGroup[i], schainHash);
            schainsInternal.removeNodeFromExceptions(schainHash, nodesInGroup[i]);
            this.addSpace(nodesInGroup[i], partOfNode);
        }
        schainsInternal.deleteGroup(schainHash);
        address from = schainsInternal.getSchainOwner(schainHash);
        schainsInternal.removeSchain(schainHash, from);
        schainsInternal.removeHolesForSchain(schainHash);
        nodeRotation.removeRotation(schainHash);
        Wallets(
            payable(contractManager.getContract("Wallets"))
        ).withdrawFundsFromSchainWallet(payable(from), schainHash);
        emit SchainDeleted(from, name, schainHash);
    }

}
