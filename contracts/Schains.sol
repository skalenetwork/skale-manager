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

pragma solidity 0.8.17;

import { AddressUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import { EnumerableSetUpgradeable }
from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import { ISchains } from "@skalenetwork/skale-manager-interfaces/ISchains.sol";
import { ISkaleVerifier } from "@skalenetwork/skale-manager-interfaces/ISkaleVerifier.sol";
import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { IKeyStorage } from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import { INodeRotation } from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import { IWallets } from "@skalenetwork/skale-manager-interfaces/IWallets.sol";

import { Permissions } from "./Permissions.sol";
import { ConstantsHolder } from "./ConstantsHolder.sol";
import { G2Operations } from "./utils/fieldOperations/G2Operations.sol";


/**
 * @title Schains
 * @dev Contains functions to manage Schains such as Schain creation,
 * deletion, and rotation.
 */
contract Schains is Permissions, ISchains {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

    struct SchainParameters {
        uint256 lifetime;
        uint8 typeOfSchain;
        uint16 nonce;
        string name;
        address originator;
        SchainOption[] options;
    }

    //    schainHash => Set of options hashes
    mapping (bytes32 => EnumerableSetUpgradeable.Bytes32Set) private _optionsIndex;
    //    schainHash => optionHash => schain option
    mapping (bytes32 => mapping (bytes32 => SchainOption)) private _options;

    bytes32 public constant SCHAIN_CREATOR_ROLE = keccak256("SCHAIN_CREATOR_ROLE");

    modifier schainExists(ISchainsInternal schainsInternal, bytes32 schainHash) {
        require(schainsInternal.isSchainExist(schainHash), "The schain does not exist");
        _;
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
    }

    /**
     * @dev Allows SkaleManager contract to create an Schain.
     *
     * Emits an {SchainCreated} event.
     *
     * Requirements:
     *
     * - Schain type is valid.
     * - There is sufficient deposit to create type of schain.
     * - If from is a smart contract originator must be specified
     */
    function addSchain(address from, uint256 deposit, bytes calldata data) external override allow("SkaleManager") {
        SchainParameters memory schainParameters = abi.decode(data, (SchainParameters));
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getConstantsHolder());
        uint256 schainCreationTimeStamp = constantsHolder.schainCreationTimeStamp();
        uint256 minSchainLifetime = constantsHolder.minimalSchainLifetime();
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
     * - If schain owner is a smart contract schain originator must be specified
     */
    function addSchainByFoundation(
        uint256 lifetime,
        uint8 typeOfSchain,
        uint16 nonce,
        string calldata name,
        address schainOwner,
        address schainOriginator,
        SchainOption[] calldata options
    )
        external
        payable
        override
    {
        require(hasRole(SCHAIN_CREATOR_ROLE, msg.sender), "Sender is not authorized to create schain");

        SchainParameters memory schainParameters = SchainParameters({
            lifetime: lifetime,
            typeOfSchain: typeOfSchain,
            nonce: nonce,
            name: name,
            originator: schainOriginator,
            options: options
        });

        address _schainOwner;
        if (schainOwner != address(0)) {
            _schainOwner = schainOwner;
        } else {
            _schainOwner = msg.sender;
        }

        _addSchain(_schainOwner, 0, schainParameters);
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        IWallets(payable(contractManager.getContract("Wallets"))).rechargeSchainWallet{value: msg.value}(schainHash);
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
    function deleteSchain(address from, string calldata name) external override allow("SkaleManager") {
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
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
    function deleteSchainByRoot(string calldata name) external override allow("SkaleManager") {
        _deleteSchain(name, ISchainsInternal(contractManager.getContract("SchainsInternal")));
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
    function restartSchainCreation(string calldata name) external override allow("SkaleManager") {
        INodeRotation nodeRotation = INodeRotation(contractManager.getContract("NodeRotation"));
        bytes32 schainHash = keccak256(abi.encodePacked(name));
        ISkaleDKG skaleDKG = ISkaleDKG(contractManager.getContract("SkaleDKG"));
        require(!skaleDKG.isLastDKGSuccessful(schainHash), "DKG success");
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isAnyFreeNode(schainHash), "No free Nodes for new group formation");
        uint256 newNodeIndex = nodeRotation.rotateNode(
                skaleDKG.pendingToBeReplaced(schainHash),
                schainHash,
                false,
                true
            );
        skaleDKG.resetPendingToBeReplaced(schainHash);
        skaleDKG.openChannel(schainHash);
        emit NodeAdded(schainHash, newNodeIndex);
    }


    /**
     * @dev Checks whether schain group signature is valid.
     */
    function verifySchainSignature(
        uint256 signatureA,
        uint256 signatureB,
        bytes32 hash,
        uint256 counter,
        uint256 hashA,
        uint256 hashB,
        string calldata schainName
    )
        external
        view
        override
        returns (bool valid)
    {
        ISkaleVerifier skaleVerifier = ISkaleVerifier(contractManager.getContract("SkaleVerifier"));
        ISkaleDKG.G2Point memory publicKey = G2Operations.getG2Zero();
        bytes32 schainHash = keccak256(abi.encodePacked(schainName));
        if (
            INodeRotation(contractManager.getContract("NodeRotation")).isNewNodeFound(schainHash) &&
            INodeRotation(contractManager.getContract("NodeRotation")).isRotationInProgress(schainHash) &&
            ISkaleDKG(contractManager.getContract("SkaleDKG")).isLastDKGSuccessful(schainHash)
        ) {
            publicKey = IKeyStorage(
                contractManager.getContract("KeyStorage")
            ).getPreviousPublicKey(
                schainHash
            );
        } else {
            publicKey = IKeyStorage(
                contractManager.getContract("KeyStorage")
            ).getCommonPublicKey(
                schainHash
            );
        }
        return skaleVerifier.verify({
            signature: ISkaleDKG.Fp2Point({
                a: signatureA,
                b: signatureB
            }),
            hash: hash,
            counter: counter,
            hashA: hashA,
            hashB: hashB,
            publicKey: publicKey
        });
    }

    function getOption(
        bytes32 schainHash,
        string calldata optionName
    )
        external
        view
        override
        returns (bytes memory option)
    {
        bytes32 optionHash = keccak256(abi.encodePacked(optionName));
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal"));
        return _getOption(schainHash, optionHash, schainsInternal);
    }

    function getOptions(bytes32 schainHash) external view override returns (SchainOption[] memory option) {
        SchainOption[] memory options = new SchainOption[](_optionsIndex[schainHash].length());
        for (uint256 i = 0; i < options.length; ++i) {
            options[i] = _options[schainHash][_optionsIndex[schainHash].at(i)];
        }
        return options;
    }

    /**
     * @dev Returns the current price in SKL tokens for given Schain type and lifetime.
     */
    function getSchainPrice(uint256 typeOfSchain, uint256 lifetime) public view override returns (uint256 price) {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getConstantsHolder());
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
        uint256 nodeDeposit = constantsHolder.NODE_DEPOSIT();
        uint256 numberOfNodes;
        uint8 divisor;
        (divisor, numberOfNodes) = schainsInternal.getSchainType(typeOfSchain);
        if (divisor == 0) {
            return 1e18;
        } else {
            uint256 up = nodeDeposit * numberOfNodes * lifetime * 2;
            uint256 down = uint256(
                uint256(constantsHolder.SMALL_DIVISOR())
                * uint256(constantsHolder.SECONDS_TO_YEAR())
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
        address originator,
        uint256 deposit,
        uint256 lifetime,
        ISchainsInternal schainsInternal,
        SchainOption[] memory options
    )
        private
    {
        require(schainsInternal.isSchainNameAvailable(name), "Schain name is not available");

        bytes32 schainHash = keccak256(abi.encodePacked(name));
        for (uint256 i = 0; i < options.length; ++i) {
            _setOption(schainHash, options[i]);
        }

        // initialize Schain
        schainsInternal.initializeSchain({
            name: name,
            from: from,
            originator: originator,
            lifetime: lifetime,
            deposit: deposit
        });
    }

    /**
     * @dev Allows creation of node group for Schain.
     *
     * Emits an {SchainNodes} event.
     */
    function _createGroupForSchain(
        string memory schainName,
        bytes32 schainHash,
        uint256 numberOfNodes,
        uint8 partOfNode,
        ISchainsInternal schainsInternal
    )
        private
    {
        uint256[] memory nodesInGroup = schainsInternal.createGroupForSchain(schainHash, numberOfNodes, partOfNode);
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
    function _addSchain(address from, uint256 deposit, SchainParameters memory schainParameters) private {
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));

        require(!schainParameters.originator.isContract(), "Originator address must be not a contract");
        if (from.isContract()) {
            require(schainParameters.originator != address(0), "Originator address is not provided");
        } else {
            schainParameters.originator = address(0);
        }

        //initialize Schain
        _initializeSchainInSchainsInternal({
            name: schainParameters.name,
            from: from,
            originator: schainParameters.originator,
            deposit: deposit,
            lifetime: schainParameters.lifetime,
            schainsInternal: schainsInternal,
            options: schainParameters.options
        });

        // create a group for Schain
        uint256 numberOfNodes;
        uint8 partOfNode;
        (partOfNode, numberOfNodes) = schainsInternal.getSchainType(schainParameters.typeOfSchain);

        _createGroupForSchain({
            schainName: schainParameters.name,
            schainHash: keccak256(abi.encodePacked(schainParameters.name)),
            numberOfNodes: numberOfNodes,
            partOfNode: partOfNode,
            schainsInternal: schainsInternal
        });

        emit SchainCreated({
            name: schainParameters.name,
            owner: from,
            partOfNode: partOfNode,
            lifetime: schainParameters.lifetime,
            numberOfNodes: numberOfNodes,
            deposit: deposit,
            nonce: schainParameters.nonce,
            schainHash: keccak256(abi.encodePacked(schainParameters.name))
        });
    }

    function _deleteSchain(string calldata name, ISchainsInternal schainsInternal) private {
        INodeRotation nodeRotation = INodeRotation(contractManager.getContract("NodeRotation"));

        bytes32 schainHash = keccak256(abi.encodePacked(name));
        require(schainsInternal.isSchainExist(schainHash), "Schain does not exist");

        _deleteOptions(schainHash, schainsInternal);

        uint256[] memory nodesInGroup = schainsInternal.getNodesInGroup(schainHash);
        for (uint256 i = 0; i < nodesInGroup.length; i++) {
            if (schainsInternal.checkHoleForSchain(schainHash, i)) {
                continue;
            }
            require(
                schainsInternal.checkSchainOnNode(nodesInGroup[i], schainHash),
                "Some Node does not contain given Schain"
            );
            schainsInternal.removeNodeFromSchain(nodesInGroup[i], schainHash);
        }
        schainsInternal.removeAllNodesFromSchainExceptions(schainHash);
        schainsInternal.deleteGroup(schainHash);
        address from = schainsInternal.getSchainOwner(schainHash);
        schainsInternal.removeHolesForSchain(schainHash);
        nodeRotation.removeRotation(schainHash);
        schainsInternal.removeSchain(schainHash, from);
        IWallets(
            payable(contractManager.getContract("Wallets"))
        ).withdrawFundsFromSchainWallet(payable(from), schainHash);
        emit SchainDeleted(from, name, schainHash);
    }

    function _setOption(
        bytes32 schainHash,
        SchainOption memory option
    )
        private
    {
        bytes32 optionHash = keccak256(abi.encodePacked(option.name));
        _options[schainHash][optionHash] = option;
        require(_optionsIndex[schainHash].add(optionHash), "The option has been set already");
    }

    function _deleteOptions(
        bytes32 schainHash,
        ISchainsInternal schainsInternal
    )
        private
        schainExists(schainsInternal, schainHash)
    {
        while (_optionsIndex[schainHash].length() > 0) {
            bytes32 optionHash = _optionsIndex[schainHash].at(0);
            delete _options[schainHash][optionHash];
            require(_optionsIndex[schainHash].remove(optionHash), "Removing error");
        }
    }

    function _getOption(
        bytes32 schainHash,
        bytes32 optionHash,
        ISchainsInternal schainsInternal
    )
        private
        view
        schainExists(schainsInternal, schainHash)
        returns (bytes memory option)
    {
        require(_optionsIndex[schainHash].contains(optionHash), "Option is not set");
        return _options[schainHash][optionHash].value;
    }
}
