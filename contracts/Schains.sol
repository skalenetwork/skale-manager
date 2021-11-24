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

pragma solidity 0.8.9;

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


/**
 * @title Schains
 * @dev Contains functions to manage Schains such as Schain creation,
 * deletion, and rotation.
 */
contract Schains is Permissions, ISchains {

    struct SchainParameters {
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
        uint16 nonce,
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
    function addSchain(address from, uint deposit, bytes calldata data) external allow("SkaleManager") {
        SchainParameters memory schainParameters = _fallbackSchainParametersDataConverter(data);
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getConstantsHolder());
        uint schainCreationTimeStamp = constantsHolder.schainCreationTimeStamp();
        uint minSchainLifetime = constantsHolder.minimalSchainLifetime();
        require(block.timestamp >= schainCreationTimeStamp, "It is not a time for creating Schain");
        require(
            schainParameters.lifetime >= minSchainLifetime,
            "Minimal schain lifetime should be satisfied"
        );
        require(
            getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime) <= deposit,
            "Not enough money to create Schain");

        _addSchain(from, deposit, schainParameters);
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
        uint lifetime,
        uint8 typeOfSchain,
        uint16 nonce,
        string calldata name,
        address schainOwner
    )
        external
        payable
    {
        require(hasRole(SCHAIN_CREATOR_ROLE, msg.sender), "Sender is not authorized to create schain");

        SchainParameters memory schainParameters = SchainParameters({
            lifetime: lifetime,
            typeOfSchain: typeOfSchain,
            nonce: nonce,
            name: name
        });

        address _schainOwner;
        if (schainOwner != address(0)) {
            _schainOwner = schainOwner;
        } else {
            _schainOwner = msg.sender;
        }

        _addSchain(_schainOwner, 0, schainParameters);
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

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
     * @dev Returns the current price in SKL tokens for given Schain type and lifetime.
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getConstantsHolder());
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        uint nodeDeposit = constantsHolder.NODE_DEPOSIT();
        uint numberOfNodes;
        uint8 divisor;
        (divisor, numberOfNodes) = schainsInternal.getSchainType(typeOfSchain);
        if (divisor == 0) {
            return 1e18;
        } else {
            uint up = nodeDeposit * numberOfNodes * lifetime * 2;
            uint down = uint(
                uint(constantsHolder.SMALL_DIVISOR())
                * uint(constantsHolder.SECONDS_TO_YEAR())
                / divisor
            );
            return up / down;
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
        uint lifetime,
        SchainsInternal schainsInternal
    )
        private
    {
        require(schainsInternal.isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        schainsInternal.initializeSchain(name, from, lifetime, deposit);
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
    function _addSchain(address from, uint deposit, SchainParameters memory schainParameters) private {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));

        //initialize Schain
        _initializeSchainInSchainsInternal(
            schainParameters.name,
            from,
            deposit,
            schainParameters.lifetime,
            schainsInternal
        );

        // create a group for Schain
        uint numberOfNodes;
        uint8 partOfNode;
        (partOfNode, numberOfNodes) = schainsInternal.getSchainType(schainParameters.typeOfSchain);

        _createGroupForSchain(
            schainParameters.name,
            keccak256(abi.encodePacked(schainParameters.name)),
            numberOfNodes,
            partOfNode,
            schainsInternal
        );

        emit SchainCreated(
            schainParameters.name,
            from,
            partOfNode,
            schainParameters.lifetime,
            numberOfNodes,
            deposit,
            schainParameters.nonce,
            keccak256(abi.encodePacked(schainParameters.name)));
    }

    function _deleteSchain(string calldata name, SchainsInternal schainsInternal) private {
        NodeRotation nodeRotation = NodeRotation(contractManager.getContract("NodeRotation"));

        bytes32 schainHash = keccak256(abi.encodePacked(name));
        require(schainsInternal.isSchainExist(schainHash), "Schain does not exist");

        uint[] memory nodesInGroup = schainsInternal.getNodesInGroup(schainHash);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            if (schainsInternal.checkHoleForSchain(schainHash, i)) {
                continue;
            }
            require(
                schainsInternal.checkSchainOnNode(nodesInGroup[i], schainHash),
                "Some Node does not contain given Schain"
            );
            schainsInternal.removeNodeFromSchain(nodesInGroup[i], schainHash);
            schainsInternal.removeNodeFromExceptions(schainHash, nodesInGroup[i]);
        }
        schainsInternal.deleteGroup(schainHash);
        address from = schainsInternal.getSchainOwner(schainHash);
        schainsInternal.removeHolesForSchain(schainHash);
        nodeRotation.removeRotation(schainHash);
        schainsInternal.removeSchain(schainHash, from);
        Wallets(
            payable(contractManager.getContract("Wallets"))
        ).withdrawFundsFromSchainWallet(payable(from), schainHash);
        emit SchainDeleted(from, name, schainHash);
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
}
