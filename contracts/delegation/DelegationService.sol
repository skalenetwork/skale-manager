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

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";

import "../Permissions.sol";
import "../interfaces/delegation/IHolderDelegation.sol";
import "../interfaces/delegation/IValidatorDelegation.sol";
import "./DelegationRequestManager.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";
import "./Distributor.sol";
import "./SkaleBalances.sol";


contract DelegationService is Permissions, IHolderDelegation, IValidatorDelegation, IERC777Recipient {

    event DelegationRequestIsSent(
        uint delegationId
    );

    event ValidatorRegistered(
        uint validatorId
    );

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function requestUndelegation(uint delegationId) external {
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(
            delegationController.getDelegation(delegationId).holder == msg.sender,
            "Can't request undelegation because sender is not a holder");

        tokenState.requestUndelegation(delegationId);
    }

    /// @notice Allows validator to accept tokens delegated at `delegationId`
    function accept(uint delegationId) external {
        DelegationRequestManager delegationRequestManager = DelegationRequestManager(
            contractManager.getContract("DelegationRequestManager")
        );
        delegationRequestManager.acceptRequest(delegationId);
    }

    /// @notice Adds node to SKALE network
    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp) external
    {
        revert("Not implemented");
    }

    function setMinimumDelegationAmount(uint amount) external {
        revert("Not implemented");
    }

    /// @notice Requests return of tokens that are locked in SkaleManager
    function returnTokens(uint amount) external {
        revert("Not implemented");
    }

    /// @notice Returns array of delegation requests id
    function listDelegationRequests() external returns (uint[] memory) {
        revert("Not implemented");
    }

    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(address validator, uint amount) external {
        revert("Not implemented");
    }

    /// @notice Allows service to pay `amount` of tokens to `validator`
    function pay(address validator, uint amount) external {
        revert("Not implemented");
    }

    /// @notice Returns amount of delegated token of the validator
    function getDelegatedAmount(address validator) external returns (uint) {
        revert("Not implemented");
    }

    function setMinimumStakingRequirement(uint amount) external {
        revert("Not implemented");
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
        DelegationRequestManager delegationRequestManager = DelegationRequestManager(
            contractManager.getContract("DelegationRequestManager")
        );
        uint delegationId = delegationRequestManager.createRequest(
            msg.sender,
            validatorId,
            amount,
            delegationPeriod,
            info
        );
        emit DelegationRequestIsSent(delegationId);
    }

    function cancelPendingDelegation(uint delegationId) external {
        DelegationRequestManager delegationRequestManager = DelegationRequestManager(
            contractManager.getContract("DelegationRequestManager")
        );
        delegationRequestManager.cancelRequest(delegationId);
    }

    function getAllDelegationRequests() external returns(uint[] memory) {
        revert("Not implemented");
    }

    function getDelegationRequestsForValidator(uint validatorId) external returns (uint[] memory) {
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

    function unregisterValidator(uint validatorId) external {
        revert("Not implemented");
    }

    /// @notice return how many of validator funds are locked in SkaleManager
    function getBondAmount(uint validatorId) external returns (uint amount) {
        revert("Not implemented");
    }

    function setValidatorName(string calldata newName) external {
        revert("Not implemented");
    }

    function setValidatorDescription(string calldata description) external {
        revert("Not implemented");
    }

    function setValidatorAddress(address newAddress) external {
        revert("Not implemented");
    }

    function getValidators() external returns (uint[] memory validatorIds) {
        revert("Not implemented");
    }

    function withdrawBounty(address bountyCollectionAddress, uint amount) external {
        SkaleBalances skaleBalances = SkaleBalances(contractManager.getContract("SkaleBalances"));
        skaleBalances.withdrawBalance(msg.sender, bountyCollectionAddress, amount);
    }

    function getEarnedBountyAmount() external returns (uint) {
        SkaleBalances skaleBalances = SkaleBalances(contractManager.getContract("SkaleBalances"));
        return skaleBalances.getBalance(msg.sender);
    }

    /// @notice removes node from system
    function deleteNode(uint nodeIndex) external {
        revert("Not implemented");
    }

    /// @notice Makes all tokens of target account unavailable to move
    function lock(address wallet, uint amount) external allow("TokenSaleManager") {
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));

        require(skaleToken.balanceOf(wallet) >= tokenState.getPurchasedAmount(wallet) + amount, "Not enough founds");

        tokenState.sold(wallet, amount);
    }

    /// @notice Makes all tokens of target account available to move
    function unlock(address target) external {
        revert("Not implemented");
    }

    function getLockedOf(address wallet) external returns (uint) {
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));
        return tokenState.getLockedCount(wallet);
    }

    function getDelegatedOf(address wallet) external returns (uint) {
        revert("isDelegatedOf is not implemented");
        // return DelegationManager(contractManager.getContract("DelegationManager")).isDelegated(wallet);
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external
    {
        require(userData.length == 32, "Data length is incorrect");
        uint validatorId = abi.decode(userData, (uint));
        distributeBounty(amount, validatorId);
    }

    // private

    function distributeBounty(uint amount, uint validatorId) internal {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.checkValidatorExists(validatorId), "Validator does not exist");

        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        Distributor distributor = Distributor(contractManager.getContract("Distributor"));
        address skaleBalancesAddress = contractManager.getContract("SkaleBalances");

        Distributor.Share[] memory shares;
        uint fee;
        (shares, fee) = distributor.distributeWithFee(validatorId, amount, true);

        address validatorAddress = validatorService.getValidator(validatorId).validatorAddress;
        skaleToken.send(skaleBalancesAddress, fee, abi.encode(validatorAddress));
        for (uint i = 0; i < shares.length; ++i) {
            skaleToken.send(skaleBalancesAddress, shares[i].amount, abi.encode(shares[i].holder));
        }
    }
}
