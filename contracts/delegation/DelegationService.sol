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
import "./SkaleBalances.sol";
import "./TokenState.sol";
import "./TimeHelpers.sol";


contract DelegationService is Permissions {

    event DelegationRequestIsSent(
        uint delegationId
    );

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

    function getDelegationsByHolder(DelegationController.State state) external returns (uint[] memory) {
        revert("getDelegationsByHolder is not implemented");
        // DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        // return delegationController.getDelegationsByHolder(msg.sender, state);
    }

    function getDelegationsForValidator(DelegationController.State state) external returns (uint[] memory) {
        revert("getDelegationsForValidator is not implemetned");
        // DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        // return delegationController.getDelegationsForValidator(msg.sender, state);
    }

    function setMinimumDelegationAmount(uint /* amount */) external {
        revert("Not implemented");
    }

    /// @notice Returns array of delegation requests id
    function listDelegationRequests() external pure returns (uint[] memory) {
        revert("Not implemented");
    }

    function forgive(address wallet, uint amount) external onlyOwner() {
        revert("forgive is not implemented");
        // TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        // tokenState.forgive(wallet, amount);
    }

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(uint validatorId) external returns (uint) {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        return delegationController.calculateTotalDelegatedToValidatorNow(validatorId);
    }

    /// @notice Creates request to delegate `amount` of tokens to `validator` from the begining of the next month
    function delegate(
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
    {

        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));

        require(
            validatorService.checkMinimumDelegation(validatorId, amount),
            "Amount doesn't meet minimum delegation amount"
        );
        require(validatorService.trustedValidators(validatorId), "Validator is not authorized to accept request");
        require(
            delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod),
            "This delegation period is not allowed"
        );

        // check that there is enough money
        uint holderBalance = skaleToken.balanceOf(msg.sender);
        uint forbiddenForDelegation = tokenState.calculateForbiddenForDelegationAmount(msg.sender);
        require(holderBalance >= amount + forbiddenForDelegation, "Delegator doesn't have enough tokens to delegate");

        uint delegationId = delegationController.addDelegation(
            msg.sender,
            validatorId,
            amount,
            delegationPeriod,
            info
        );

        emit DelegationRequestIsSent(delegationId);
    }

    function cancelPendingDelegation(uint delegationId) external {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        DelegationController.Delegation memory delegation = delegationController.getDelegation(delegationId);
        require(msg.sender == delegation.holder, "Only token holders can cancel delegation request");

        delegationController.cancel(delegationId);
    }

    function getAllDelegationRequests() external pure returns(uint[] memory) {
        revert("Not implemented");
    }

    function getDelegationRequestsForValidator(uint /* validatorId */) external returns (uint[] memory) {
        revert("Not implemented");
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

    function unregisterValidator(uint /* validatorId */) external {
        revert("Not implemented");
    }

    /// @notice return how many of validator funds are locked in SkaleManager
    function getBondAmount(uint /* validatorId */) external returns (uint) {
        revert("Not implemented");
    }

    function setValidatorName(string calldata /* newName */) external {
        revert("Not implemented");
    }

    function setValidatorDescription(string calldata /* description */) external {
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

    function getValidators() external view returns (uint[] memory validatorIds) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        validatorIds = new uint[](validatorService.numberOfValidators());
        for (uint i = 0; i < validatorIds.length; ++i) {
            validatorIds[i] = i + 1;
        }
    }

    /// @notice removes node from system
    function deleteNode(uint /* nodeIndex */) external {
        revert("Not implemented");
    }

    /// @notice Makes all tokens of target account unavailable to move
    function lock(address wallet, uint amount) external allow("TokenSaleManager") {
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));

        require(skaleToken.balanceOf(wallet) >= tokenState.getPurchasedAmount(wallet) + amount, "Not enough founds");

        tokenState.sold(wallet, amount);
    }

    function getDelegatedOf(address wallet) external returns (uint) {
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        return tokenState.getDelegatedCount(wallet);
    }

    function getSlashedOf(address wallet) external view returns (uint) {
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        return tokenState.getSlashedAmount(wallet);
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
    }
}
