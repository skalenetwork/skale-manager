// SPDX-License-Identifier: AGPL-3.0-only

/*
    ValidatorService.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Dmytro Stebaiev
    @author Artem Payvin
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

pragma solidity 0.8.26;

import {
    ECDSAUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {
    IValidatorService
} from "@skalenetwork/skale-manager-interfaces/delegation/IValidatorService.sol";
import {
    IDelegationController
} from "@skalenetwork/skale-manager-interfaces/delegation/IDelegationController.sol";
import {
    IPaymasterController
} from "@skalenetwork/skale-manager-interfaces/IPaymasterController.sol";

import {AddressIsNotSet, RoleRequired} from "../CommonErrors.sol";
import {Permissions} from "../Permissions.sol";


error ValidatorDoesNotExist(uint256 id);
error AddressIsAlreadyInUse(address validatorAddress);
error WrongFeeValue(uint256 value);
error ValidatorIsAlreadyEnabled(uint256 validatorId);
error ValidatorIsAlreadyDisabled(uint256 validatorId);
error SenderHasToBeEqualToRequestedAddress(
    address sender,
    address requestedAddress
);
error WrongSignature();
error NodeAddressIsAValidator(address nodeAddress, uint256 validatorId);
error AcceptingRequestIsAlreadyEnabled(uint256 validatorId);
error AcceptingRequestIsAlreadyDisabled(uint256 validatorId);
error NoPermissionsToUnlinkNode(uint256 validatorId, address nodeAddress);
error NodeAddressIsNotAssignedToValidator(address nodeAddress);
error ValidatorIsNotAuthorized(
    uint256 validatorId
);
error ValidatorIsNotCurrentlyAcceptingNewRequests(uint256 validatorId);
error AmountDoesNotMeetTheValidatorsMinimumDelegationAmount(
    uint256 amount,
    uint256 minimum
);
error ValidatorAddressDoesNotExist(address validatorAddress);
error ValidatorCannotOverrideNodeAddress(
    uint256 validatorId,
    address nodeAddress
);

/**
 * @title ValidatorService
 * @dev This contract handles all validator operations including registration,
 * node management, validator-specific delegation parameters, and more.
 *
 * TIP: For more information see our main instructions
 * https://forum.skale.network/t/skale-mainnet-launch-faq/182[SKALE MainNet Launch FAQ].
 *
 * Validators register an address, and use this address to accept delegations and
 * register nodes.
 */
contract ValidatorService is Permissions, IValidatorService {
    using ECDSAUpgradeable for bytes32;

    mapping(uint256 => Validator) public validators;
    mapping(uint256 => bool) private _trustedValidators;
    uint256[] public trustedValidatorsList;
    //       address => validatorId
    mapping(address => uint256) private _validatorAddressToId;
    //       address => validatorId
    mapping(address => uint256) private _nodeAddressToValidatorId;
    // validatorId => nodeAddress[]
    mapping(uint256 => address[]) private _nodeAddresses;
    uint256 public numberOfValidators;
    bool public useWhitelist;

    bytes32 public constant VALIDATOR_MANAGER_ROLE =
        keccak256("VALIDATOR_MANAGER_ROLE");

    modifier onlyValidatorManager() {
        if (!hasRole(VALIDATOR_MANAGER_ROLE, msg.sender)) {
            revert RoleRequired(VALIDATOR_MANAGER_ROLE);
        }
        _;
    }

    modifier checkValidatorExists(uint256 validatorId) {
        if (!validatorExists(validatorId)) {
            revert ValidatorDoesNotExist(validatorId);
        }
        _;
    }

    function initialize(
        address contractManagerAddress
    ) public override initializer {
        Permissions.initialize(contractManagerAddress);
        useWhitelist = true;
    }

    /**
     * @dev Creates a new validator ID that includes a validator name, description,
     * commission or fee rate, and a minimum delegation amount accepted by the validator.
     *
     * Emits a {ValidatorRegistered} event.
     *
     * Requirements:
     *
     * - Sender must not already have registered a validator ID.
     * - Fee rate must be between 0 - 1000‰. Note: in per mille.
     */
    function registerValidator(
        string calldata name,
        string calldata description,
        uint256 feeRate,
        uint256 minimumDelegationAmount
    ) external override returns (uint256 validatorId) {
        if (validatorAddressExists(msg.sender)) {
            revert AddressIsAlreadyInUse(msg.sender);
        }
        if (1000 < feeRate) {
            revert WrongFeeValue(feeRate);
        }
        validatorId = ++numberOfValidators;
        validators[validatorId] = IValidatorService.Validator({
            name: name,
            validatorAddress: msg.sender,
            requestedAddress: address(0),
            description: description,
            feeRate: feeRate,
            registrationTime: block.timestamp,
            minimumDelegationAmount: minimumDelegationAmount,
            acceptNewRequests: true
        });
        _setValidatorAddress(validatorId, msg.sender);

        emit ValidatorRegistered(validatorId);

        IPaymasterController paymasterController = IPaymasterController(
            contractManager.getContract("PaymasterController")
        );
        paymasterController.addValidator(validatorId, msg.sender);
    }

    /**
     * @dev Allows Admin to enable a validator by adding their ID to the
     * trusted list.
     *
     * Emits a {ValidatorWasEnabled} event.
     *
     * Requirements:
     *
     * - Validator must not already be enabled.
     */
    function enableValidator(
        uint256 validatorId
    ) external override checkValidatorExists(validatorId) onlyValidatorManager {
        if (_trustedValidators[validatorId]) {
            revert ValidatorIsAlreadyEnabled(validatorId);
        }
        _trustedValidators[validatorId] = true;
        trustedValidatorsList.push(validatorId);
        emit ValidatorWasEnabled(validatorId);
    }

    /**
     * @dev Allows Admin to disable a validator by removing their ID from
     * the trusted list.
     *
     * Emits a {ValidatorWasDisabled} event.
     *
     * Requirements:
     *
     * - Validator must not already be disabled.
     */
    function disableValidator(
        uint256 validatorId
    ) external override checkValidatorExists(validatorId) onlyValidatorManager {
        if (!_trustedValidators[validatorId]) {
            revert ValidatorIsAlreadyDisabled(validatorId);
        }
        _trustedValidators[validatorId] = false;
        uint256 position = _find(trustedValidatorsList, validatorId);
        if (position < trustedValidatorsList.length) {
            trustedValidatorsList[position] = trustedValidatorsList[
                trustedValidatorsList.length - 1
            ];
        }
        trustedValidatorsList.pop();
        emit ValidatorWasDisabled(validatorId);
    }

    /**
     * @dev Owner can disable the trusted validator list. Once turned off, the
     * trusted list cannot be re-enabled.
     */
    function disableWhitelist() external override onlyValidatorManager {
        useWhitelist = false;
        emit WhitelistDisabled(false);
    }

    /**
     * @dev Allows `msg.sender` to request a new address.
     *
     * Requirements:
     *
     * - `msg.sender` must already be a validator.
     * - New address must not be null.
     * - New address must not be already registered as a validator.
     */
    function requestForNewAddress(
        address newValidatorAddress
    ) external override {
        if (newValidatorAddress == address(0)) {
            revert AddressIsNotSet();
        }
        if (_validatorAddressToId[newValidatorAddress] != 0) {
            revert AddressIsAlreadyInUse(newValidatorAddress);
        }
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);

        validators[validatorId].requestedAddress = newValidatorAddress;
        emit RequestNewAddress(validatorId, msg.sender, newValidatorAddress);
    }

    /**
     * @dev Allows msg.sender to confirm an address change.
     *
     * Emits a {ValidatorAddressChanged} event.
     *
     * Requirements:
     *
     * - Must be owner of new address.
     */
    function confirmNewAddress(
        uint256 validatorId
    ) external override checkValidatorExists(validatorId) {
        if (getValidator(validatorId).requestedAddress != msg.sender) {
            revert SenderHasToBeEqualToRequestedAddress(
                msg.sender,
                getValidator(validatorId).requestedAddress
            );
        }
        delete validators[validatorId].requestedAddress;
        _setValidatorAddress(validatorId, msg.sender);

        emit ValidatorAddressChanged(
            validatorId,
            validators[validatorId].validatorAddress
        );

        IPaymasterController paymasterController = IPaymasterController(
            contractManager.getContract("PaymasterController")
        );
        paymasterController.setValidatorAddress(validatorId, msg.sender);
    }

    /**
     * @dev Links a node address to validator ID. Validator must present
     * the node signature of the validator ID.
     *
     * Requirements:
     *
     * - Signature must be valid.
     * - Address must not be assigned to a validator.
     */
    function linkNodeAddress(
        address nodeAddress,
        bytes calldata sig
    ) external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);
        if (
            keccak256(abi.encodePacked(validatorId))
                .toEthSignedMessageHash()
                .recover(sig) != nodeAddress
        ) {
            revert WrongSignature();
        }
        if (_validatorAddressToId[nodeAddress] != 0) {
            revert NodeAddressIsAValidator(
                nodeAddress,
                _validatorAddressToId[nodeAddress]
            );
        }

        _addNodeAddress(validatorId, nodeAddress);
        emit NodeAddressWasAdded(validatorId, nodeAddress);
    }

    /**
     * @dev Unlinks a node address from a validator.
     *
     * Emits a {NodeAddressWasRemoved} event.
     */
    function unlinkNodeAddress(address nodeAddress) external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);

        this.removeNodeAddress(validatorId, nodeAddress);
        emit NodeAddressWasRemoved(validatorId, nodeAddress);
    }

    /**
     * @dev Allows a validator to set a minimum delegation amount.
     */
    function setValidatorMDA(
        uint256 minimumDelegationAmount
    ) external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);

        emit SetMinimumDelegationAmount(
            validatorId,
            validators[validatorId].minimumDelegationAmount,
            minimumDelegationAmount
        );
        validators[validatorId]
            .minimumDelegationAmount = minimumDelegationAmount;
    }

    /**
     * @dev Allows a validator to set a new validator name.
     */
    function setValidatorName(string calldata newName) external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);

        emit SetValidatorName(
            validatorId,
            validators[validatorId].name,
            newName
        );
        validators[validatorId].name = newName;
    }

    /**
     * @dev Allows a validator to set a new validator description.
     */
    function setValidatorDescription(
        string calldata newDescription
    ) external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);

        emit SetValidatorDescription(
            validatorId,
            validators[validatorId].description,
            newDescription
        );
        validators[validatorId].description = newDescription;
    }

    /**
     * @dev Allows a validator to start accepting new delegation requests.
     *
     * Requirements:
     *
     * - Must not have already enabled accepting new requests.
     */
    function startAcceptingNewRequests() external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);
        if (isAcceptingNewRequests(validatorId)) {
            revert AcceptingRequestIsAlreadyEnabled(validatorId);
        }

        validators[validatorId].acceptNewRequests = true;
        emit AcceptingNewRequests(validatorId, true);
    }

    /**
     * @dev Allows a validator to stop accepting new delegation requests.
     *
     * Requirements:
     *
     * - Must not have already stopped accepting new requests.
     */
    function stopAcceptingNewRequests() external override {
        // check Validator Exist inside getValidatorId
        uint256 validatorId = getValidatorId(msg.sender);
        if (!isAcceptingNewRequests(validatorId)) {
            revert AcceptingRequestIsAlreadyDisabled(validatorId);
        }

        validators[validatorId].acceptNewRequests = false;
        emit AcceptingNewRequests(validatorId, false);
    }

    function removeNodeAddress(
        uint256 validatorId,
        address nodeAddress
    ) external override allowTwo("ValidatorService", "Nodes") {
        if (_nodeAddressToValidatorId[nodeAddress] != validatorId) {
            revert NoPermissionsToUnlinkNode(validatorId, nodeAddress);
        }
        delete _nodeAddressToValidatorId[nodeAddress];
        for (uint256 i = 0; i < _nodeAddresses[validatorId].length; ++i) {
            if (_nodeAddresses[validatorId][i] == nodeAddress) {
                if (i + 1 < _nodeAddresses[validatorId].length) {
                    _nodeAddresses[validatorId][i] = _nodeAddresses[
                        validatorId
                    ][_nodeAddresses[validatorId].length - 1];
                }
                delete _nodeAddresses[validatorId][
                    _nodeAddresses[validatorId].length - 1
                ];
                _nodeAddresses[validatorId].pop();
                break;
            }
        }
    }

    /**
     * @dev Returns the amount of validator bond (self-delegation).
     */
    function getAndUpdateBondAmount(
        uint256 validatorId
    ) external override returns (uint256 bond) {
        IDelegationController delegationController = IDelegationController(
            contractManager.getContract("DelegationController")
        );
        return
            delegationController.getAndUpdateDelegatedByHolderToValidatorNow(
                getValidator(validatorId).validatorAddress,
                validatorId
            );
    }

    /**
     * @dev Returns node addresses linked to the msg.sender.
     */
    function getMyNodesAddresses()
        external
        view
        override
        returns (address[] memory addresses)
    {
        return getNodeAddresses(getValidatorId(msg.sender));
    }

    /**
     * @dev Returns the list of trusted validators.
     */
    function getTrustedValidators()
        external
        view
        override
        returns (uint256[] memory trustedValidators)
    {
        return trustedValidatorsList;
    }

    /**
     * @dev Checks whether the validator ID is linked to the validator address.
     */
    function checkValidatorAddressToId(
        address validatorAddress,
        uint256 validatorId
    ) external view override returns (bool valid) {
        return getValidatorId(validatorAddress) == validatorId ? true : false;
    }

    /**
     * @dev Returns the validator ID linked to a node address.
     *
     * Requirements:
     *
     * - Node address must be linked to a validator.
     */
    function getValidatorIdByNodeAddress(
        address nodeAddress
    ) external view override returns (uint256 validatorId) {
        validatorId = _nodeAddressToValidatorId[nodeAddress];
        if (validatorId == 0) {
            revert NodeAddressIsNotAssignedToValidator(nodeAddress);
        }
    }

    /**
     * @dev Returns the validator ID linked to a node address without revert.
     */
    function getValidatorIdByNodeAddressWithoutRevert(
        address nodeAddress
    ) external view override returns (uint256 validatorId) {
        validatorId = _nodeAddressToValidatorId[nodeAddress];
    }

    function checkValidatorCanReceiveDelegation(
        uint256 validatorId,
        uint256 amount
    ) external view override {
        if (!isAuthorizedValidator(validatorId)) {
            revert ValidatorIsNotAuthorized(
                validatorId
            );
        }
        if (!isAcceptingNewRequests(validatorId)) {
            revert ValidatorIsNotCurrentlyAcceptingNewRequests(validatorId);
        }
        if (amount < validators[validatorId].minimumDelegationAmount) {
            revert AmountDoesNotMeetTheValidatorsMinimumDelegationAmount(
                amount,
                validators[validatorId].minimumDelegationAmount
            );
        }
    }

    /**
     * @dev Returns a validator's node addresses.
     */
    function getNodeAddresses(
        uint256 validatorId
    ) public view override returns (address[] memory nodeAddresses) {
        return _nodeAddresses[validatorId];
    }

    /**
     * @dev Checks whether validator ID exists.
     */
    function validatorExists(
        uint256 validatorId
    ) public view override returns (bool exist) {
        return validatorId <= numberOfValidators && validatorId != 0;
    }

    /**
     * @dev Checks whether validator address exists.
     */
    function validatorAddressExists(
        address validatorAddress
    ) public view override returns (bool exist) {
        return _validatorAddressToId[validatorAddress] != 0;
    }

    /**
     * @dev Checks whether validator address exists.
     */
    function checkIfValidatorAddressExists(
        address validatorAddress
    ) public view override {
        if (!validatorAddressExists(validatorAddress)) {
            revert ValidatorAddressDoesNotExist(validatorAddress);
        }
    }

    /**
     * @dev Returns the Validator struct.
     */
    function getValidator(
        uint256 validatorId
    )
        public
        view
        override
        checkValidatorExists(validatorId)
        returns (IValidatorService.Validator memory validator)
    {
        return validators[validatorId];
    }

    /**
     * @dev Returns the validator ID for the given validator address.
     */
    function getValidatorId(
        address validatorAddress
    ) public view override returns (uint256 id) {
        checkIfValidatorAddressExists(validatorAddress);
        return _validatorAddressToId[validatorAddress];
    }

    /**
     * @dev Checks whether the validator is currently accepting new delegation requests.
     */
    function isAcceptingNewRequests(
        uint256 validatorId
    )
        public
        view
        override
        checkValidatorExists(validatorId)
        returns (bool accept)
    {
        return validators[validatorId].acceptNewRequests;
    }

    function isAuthorizedValidator(
        uint256 validatorId
    )
        public
        view
        override
        checkValidatorExists(validatorId)
        returns (bool authorized)
    {
        return _trustedValidators[validatorId] || !useWhitelist;
    }

    // private

    /**
     * @dev Links a validator address to a validator ID.
     *
     * Requirements:
     *
     * - Address is not already in use by another validator.
     */
    function _setValidatorAddress(
        uint256 validatorId,
        address validatorAddress
    ) private {
        if (_validatorAddressToId[validatorAddress] == validatorId) {
            return;
        }
        if (_validatorAddressToId[validatorAddress] != 0) {
            revert AddressIsAlreadyInUse(validatorAddress);
        }
        address oldAddress = validators[validatorId].validatorAddress;
        delete _validatorAddressToId[oldAddress];
        _nodeAddressToValidatorId[validatorAddress] = validatorId;
        validators[validatorId].validatorAddress = validatorAddress;
        _validatorAddressToId[validatorAddress] = validatorId;
    }

    /**
     * @dev Links a node address to a validator ID.
     *
     * Requirements:
     *
     * - Node address must not be already linked to a validator.
     */
    function _addNodeAddress(uint256 validatorId, address nodeAddress) private {
        if (_nodeAddressToValidatorId[nodeAddress] == validatorId) {
            return;
        }
        if (_nodeAddressToValidatorId[nodeAddress] != 0) {
            revert ValidatorCannotOverrideNodeAddress(validatorId, nodeAddress);
        }
        _nodeAddressToValidatorId[nodeAddress] = validatorId;
        _nodeAddresses[validatorId].push(nodeAddress);
    }

    function _find(
        uint256[] memory array,
        uint256 value
    ) private pure returns (uint256 index) {
        for (index = 0; index < array.length; index++) {
            if (array[index] == value) {
                return index;
            }
        }
        return array.length;
    }
}
