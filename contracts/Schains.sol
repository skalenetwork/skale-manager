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

pragma solidity 0.8.26;

import { AddressUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import { EnumerableSetUpgradeable }
from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import { IConstantsHolder } from "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import { ISchains } from "@skalenetwork/skale-manager-interfaces/ISchains.sol";
import { ISkaleVerifier } from "@skalenetwork/skale-manager-interfaces/ISkaleVerifier.sol";
import { ISkaleDKG } from "@skalenetwork/skale-manager-interfaces/ISkaleDKG.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { IKeyStorage } from "@skalenetwork/skale-manager-interfaces/IKeyStorage.sol";
import { INodeRotation } from "@skalenetwork/skale-manager-interfaces/INodeRotation.sol";
import { IWallets } from "@skalenetwork/skale-manager-interfaces/IWallets.sol";

import { G2Operations } from "./utils/fieldOperations/G2Operations.sol";
import { NotEnoughFunds, RoleRequired } from "./CommonErrors.sol";
import { PaymasterController } from "./PaymasterController.sol";
import { Permissions } from "./Permissions.sol";


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

    error SchainDoesNotExist(bytes32 schainHash);
    error SchainIsCreatedTooEarly();
    error SchainLifetimeIsTooSmall();
    error SenderIsNotTheOwnerOfTheSchain();
    error DkgWasNotFailed();
    error NoFreeNodes();
    error SchainNameIsNotAvailable(string schainName);
    error OriginatorIsAContract(address originator);
    error OriginatorIsNotProvided();
    error NodeDoesNotContainGivenSchain(uint256 node, bytes32 schain);
    error OptionIsAlreadySet(string optionName);
    error OptionRemovingError(bytes32 optionHash);
    error OptionIsNotSet(bytes32 schainHash, bytes32 optionHash);

    modifier schainExists(ISchainsInternal schainsInternal, bytes32 schainHash) {
        if(!schainsInternal.isSchainExist(schainHash)) {
            revert SchainDoesNotExist(schainHash);
        }
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
        IConstantsHolder constantsHolder = IConstantsHolder(contractManager.getConstantsHolder());
        uint256 schainCreationTimeStamp = constantsHolder.schainCreationTimeStamp();
        uint256 minSchainLifetime = constantsHolder.minimalSchainLifetime();
        if(block.timestamp < schainCreationTimeStamp) {
            revert SchainIsCreatedTooEarly();
        }
        if (schainParameters.lifetime < minSchainLifetime) {
            revert SchainLifetimeIsTooSmall();
        }
        if (deposit < getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime)) {
            revert NotEnoughFunds();
        }
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
        if (!hasRole(SCHAIN_CREATOR_ROLE, msg.sender)) {
            revert RoleRequired(SCHAIN_CREATOR_ROLE);
        }

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
        if (!schainsInternal.isOwnerAddress(from, schainHash)) {
            revert SenderIsNotTheOwnerOfTheSchain();
        }

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
        if (skaleDKG.isLastDKGSuccessful(schainHash)) {
            revert DkgWasNotFailed();
        }
        ISchainsInternal schainsInternal = ISchainsInternal(
            contractManager.getContract("SchainsInternal"));
        if (!schainsInternal.isAnyFreeNode(schainHash)) {
            revert NoFreeNodes();
        }
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
        IConstantsHolder constantsHolder = IConstantsHolder(contractManager.getConstantsHolder());
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
        uint256 nodeDeposit = constantsHolder.NODE_DEPOSIT();
        uint256 numberOfNodes;
        uint8 divisor;
        (divisor, numberOfNodes) = schainsInternal.getSchainType(typeOfSchain);
        if (divisor == 0) {
            return 1e18;
        } else {
            uint256 up = nodeDeposit * numberOfNodes * lifetime * 2;
            uint256 down = uint(
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
        address originator,
        uint256 deposit,
        uint256 lifetime,
        ISchainsInternal schainsInternal,
        SchainOption[] memory options
    )
        private
    {
        if (!schainsInternal.isSchainNameAvailable(name)) {
            revert SchainNameIsNotAvailable(name);
        }

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
        if (schainParameters.originator.isContract()) {
            revert OriginatorIsAContract(schainParameters.originator);
        }
        if (from.isContract()) {
            if (schainParameters.originator == address(0)) {
                revert OriginatorIsNotProvided();
            }
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

        PaymasterController paymasterController =
            PaymasterController(contractManager.getContract("PaymasterController"));
        paymasterController.addSchain(schainParameters.name);
    }

    function _deleteSchain(string calldata name, ISchainsInternal schainsInternal) private {
        INodeRotation nodeRotation = INodeRotation(contractManager.getContract("NodeRotation"));

        bytes32 schainHash = keccak256(abi.encodePacked(name));

        _deleteOptions(schainHash, schainsInternal);

        uint256[] memory nodesInGroup = schainsInternal.getNodesInGroup(schainHash);
        for (uint256 i = 0; i < nodesInGroup.length; i++) {
            if (schainsInternal.checkHoleForSchain(schainHash, i)) {
                continue;
            }
            if (!schainsInternal.checkSchainOnNode(nodesInGroup[i], schainHash)) {
                revert NodeDoesNotContainGivenSchain(nodesInGroup[i], schainHash);
            }
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

        PaymasterController paymasterController =
            PaymasterController(contractManager.getContract("PaymasterController"));
        paymasterController.removeSchain(schainHash);
    }

    function _setOption(
        bytes32 schainHash,
        SchainOption memory option
    )
        private
    {
        bytes32 optionHash = keccak256(abi.encodePacked(option.name));
        _options[schainHash][optionHash] = option;
        if (!_optionsIndex[schainHash].add(optionHash)) {
            revert OptionIsAlreadySet(option.name);
        }
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
            if (!_optionsIndex[schainHash].remove(optionHash)) {
                revert OptionRemovingError(optionHash);
            }
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
        if (!_optionsIndex[schainHash].contains(optionHash)) {
            revert OptionIsNotSet(schainHash, optionHash);
        }
        return _options[schainHash][optionHash].value;
    }
}
