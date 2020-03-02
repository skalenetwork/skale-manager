/*
    DelegationService.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";
import "./Distributor.sol";
import "./TokenState.sol";
import "./TimeHelpers.sol";


contract DelegationService is Permissions {

    event ValidatorRegistered(
        uint validatorId
    );

    function requestUndelegation(uint delegationId) external {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(
            delegationController.getDelegation(delegationId).holder == msg.sender,
            "Can't request undelegation because sender is not a holder");

        delegationController.requestUndelegation(delegationId);
    }

    function setMinimumDelegationAmount(uint /* amount */) external pure {
        revert("Not implemented");
    }

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(uint validatorId) external returns (uint) {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        return delegationController.getAndUpdateDelegatedToValidatorNow(validatorId);
    }

    /// @notice Register new as validator
    function registerValidator(
        string calldata name,
        string calldata description,
        uint feeRate,
        uint minimumDelegationAmount
    )
        external returns (uint validatorId)
    {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        validatorId = validatorService.registerValidator(
            name,
            msg.sender,
            description,
            feeRate,
            minimumDelegationAmount
        );
        emit ValidatorRegistered(validatorId);
    }

    function linkNodeAddress(address nodeAddress) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        validatorService.linkNodeAddress(msg.sender, nodeAddress);
    }

    function unlinkNodeAddress(address nodeAddress) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        validatorService.unlinkNodeAddress(msg.sender, nodeAddress);
    }

    function unregisterValidator(uint /* validatorId */) external pure {
        revert("Not implemented");
    }

    /// @notice return how many of validator funds are locked in SkaleManager
    function getBondAmount(uint /* validatorId */) external pure returns (uint) {
        revert("Not implemented");
    }

    function setValidatorName(string calldata /* newName */) external pure {
        revert("Not implemented");
    }

    function setValidatorDescription(string calldata /* description */) external pure {
        revert("Not implemented");
    }

    function requestForNewAddress(address newAddress) external {
        ValidatorService(contractManager.getContract("ValidatorService")).requestForNewAddress(msg.sender, newAddress);
    }

    function confirmNewAddress(uint validatorId) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        ValidatorService.Validator memory validator = validatorService.getValidator(validatorId);

        require(
            validator.requestedAddress == msg.sender,
            "The validator cannot be changed because it isn't the actual owner"
        );

        validatorService.confirmNewAddress(msg.sender, validatorId);
    }

    /// @notice removes node from system
    function deleteNode(uint /* nodeIndex */) external pure {
        revert("Not implemented");
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
    }
}
