// SPDX-License-Identifier: AGPL-3.0-only

/*
    Wallets.sol - SKALE Manager
    Copyright (C) 2021-Present SKALE Labs
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

pragma solidity 0.8.11;

import "@skalenetwork/skale-manager-interfaces/IWallets.sol";
import "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import "@skalenetwork/skale-manager-interfaces/delegation/IValidatorService.sol";
import "@skalenetwork/skale-manager-interfaces/IConstantsHolder.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./Permissions.sol";

/**
 * @title Wallets
 * @dev Contract contains logic to perform automatic self-recharging ether for nodes
 * from validator wallets or schain wallets. Where validators can top up a validator 
 * wallet and node addresses for this validator would be auto recharged. And schain 
 * owners should hold funds for recharging nodes that provide security for the schain.
 */
contract Wallets is Permissions, IWallets {
    using AddressUpgradeable for address payable;

    // mapping which store validator eth balance
    // validatorId => eth balance
    mapping (uint => uint) private _validatorWallets;
    // mapping which store schain eth balance
    //    schainHash => eth balance
    mapping (bytes32 => uint) private _schainWallets;
    // mapping which store how much schain wallet spend
    // which should be covered by validator
    //    schainHash => eth balance
    mapping (bytes32 => uint) private _schainDebts;

    /**
     * @dev Emitted when the validator wallet was funded
     */
    event ValidatorWalletRecharged(address sponsor, uint amount, uint validatorId);

    /**
     * @dev Emitted when the schain wallet was funded
     */
    event SchainWalletRecharged(address sponsor, uint amount, bytes32 schainHash);

    /**
     * @dev Emitted when the node received a refund from validator to its wallet
     */
    event NodeRefundedByValidator(address node, uint validatorId, uint amount);

    /**
     * @dev Emitted when the node received a refund from schain to its wallet
     */
    event NodeRefundedBySchain(address node, bytes32 schainHash, uint amount);

    /**
     * @dev Emitted when the validator withdrawn funds from validator wallet
     */
    event WithdrawFromValidatorWallet(uint indexed validatorId, uint amount);

    /**
     * @dev Emitted when the schain owner withdrawn funds from schain wallet
     */
    event WithdrawFromSchainWallet(bytes32 indexed schainHash, uint amount);

    /**
     * @dev Emitted when validators returns a debt to schain wallet
     */
    event ReturnDebtFromValidator(uint validatorId, bytes32 schainHash, uint debtAmount);

    /**
     * @dev Is executed on a call to the contract with empty calldata. 
     * This is the function that is executed on plain Ether transfers,
     * so validator or schain owner can use usual transfer ether to recharge wallet.
     */
    receive() external payable override {
        IValidatorService validatorService = IValidatorService(contractManager.getContract("ValidatorService"));
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
        bytes32[] memory schainHashes = schainsInternal.getSchainHashesByAddress(msg.sender);
        if (schainHashes.length == 1) {
            rechargeSchainWallet(schainHashes[0]);
        } else {
            uint validatorId = validatorService.getValidatorId(msg.sender);
            rechargeValidatorWallet(validatorId);
        }
    }

    /**
     * @dev Reimburse gas for node by validator wallet if node has less than
     * `minNodeBalance` amount after current tx. If validator wallet has insufficient
     * funds the node will receive the entire remaining amount in the validator's wallet.
     * 
     * Emits a {NodeRefundedByValidator} event.
     * 
     * Requirements: 
     * - Given validator should exist
     * - `spender` address should not be zero address
     */
    function refundGasByValidator(
        uint validatorId,
        address payable spender,
        uint gasLimit
    )
        external
        override
        allow("SkaleManager")
    {
        require(spender != address(0), "Spender must be specified");
        require(validatorId != 0, "ValidatorId could not be zero");
        uint minNodeBalance = IConstantsHolder(contractManager.getContract("ConstantsHolder")).minNodeBalance();
        uint actualSpenderBalance = spender.balance + gasLimit * tx.gasprice;
        if (minNodeBalance > actualSpenderBalance) {
            uint amount = Math.min(_validatorWallets[validatorId],  minNodeBalance - actualSpenderBalance);
            _validatorWallets[validatorId] -= amount;
                emit NodeRefundedByValidator(spender, validatorId, amount);
                spender.transfer(amount);
        }
    }

    /**
     * @dev Returns the amount owed to the owner of the schain by the validator, 
     * if the validator does not have enough funds, then everything 
     * that the validator has will be returned to the owner of the schain.
     *
     * Emits a {ReturnDebtFromValidator} event.
     *
     */
    function refundGasByValidatorToSchain(uint validatorId, bytes32 schainHash) external override allow("SkaleDKG") {
        uint debtAmount = _schainDebts[schainHash];
        uint validatorWallet = _validatorWallets[validatorId];
        if (debtAmount <= validatorWallet) {
            _validatorWallets[validatorId] = validatorWallet - debtAmount;
        } else {
            debtAmount = validatorWallet;
            delete _validatorWallets[validatorId];
        }
        _schainWallets[schainHash] = _schainWallets[schainHash] + debtAmount;
        delete _schainDebts[schainHash];
        emit ReturnDebtFromValidator(validatorId, schainHash, debtAmount);
    }

    /**
     * @dev Reimburse gas for node by schain wallet. If schain wallet has not enough funds 
     * than transaction will be reverted.
     * 
     * Emits a {NodeRefundedBySchain} event.
     * 
     * Requirements: 
     * - Given schain should exist
     * - Schain wallet should have enough funds
     * - `spender` address should not be zero address
     */
    function refundGasBySchain(
        bytes32 schainHash,
        address payable spender,
        uint spentGas,
        bool isDebt
    )
        external
        override
        allowTwo("SkaleDKG", "CommunityPool")
    {
        require(spender != address(0), "Spender must be specified");
        uint amount = tx.gasprice * spentGas;
        if (isDebt) {
            amount += (_schainDebts[schainHash] == 0 ? 21000 : 6000) * tx.gasprice;
            _schainDebts[schainHash] = _schainDebts[schainHash] + amount;
        }
        require(schainHash != bytes32(0), "SchainHash cannot be null");
        require(amount <= _schainWallets[schainHash], "Schain wallet has not enough funds");
        _schainWallets[schainHash] = _schainWallets[schainHash] - amount;
        emit NodeRefundedBySchain(spender, schainHash, amount);
        spender.transfer(amount);
    }

    /**
     * @dev Withdraws ether from schain wallet. Possible to execute only after deleting schain.
     * 
     * Requirements: 
     * - Executable only after initializing delete schain
     * - Schain should not be Active
     */
    function withdrawFundsFromSchainWallet(address payable schainOwner, bytes32 schainHash)
        external
        override
        allow("Schains")
    {
        require(schainOwner != address(0), "Schain owner must be specified");
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
        require(!schainsInternal.isSchainActive(schainHash), "Schain is active");
        uint amount = _schainWallets[schainHash];
        delete _schainWallets[schainHash];
        emit WithdrawFromSchainWallet(schainHash, amount);
        schainOwner.sendValue(amount);
    }
    
    /**
     * @dev Withdraws ether from validator wallet.
     * 
     * Requirements: 
     * - Validator must have sufficient withdrawal amount
     * - `msg.sender` should be a validator address
     */
    function withdrawFundsFromValidatorWallet(uint amount) external override {
        IValidatorService validatorService = IValidatorService(contractManager.getContract("ValidatorService"));
        uint validatorId = validatorService.getValidatorId(msg.sender);
        require(amount <= _validatorWallets[validatorId], "Balance is too low");
        _validatorWallets[validatorId] = _validatorWallets[validatorId] - amount;
        emit WithdrawFromValidatorWallet(validatorId, amount);
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Returns schain eth balance.
     */
    function getSchainBalance(bytes32 schainHash) external view override returns (uint) {
        return _schainWallets[schainHash];
    }

    /**
     * @dev Returns validator eth balance.
     */
    function getValidatorBalance(uint validatorId) external view override returns (uint) {
        return _validatorWallets[validatorId];
    }

    /**
     * @dev Recharge the validator wallet by id.
     * 
     * Emits a {ValidatorWalletRecharged} event.
     * 
     * Requirements: 
     * - Given validator must exist
     */
    function rechargeValidatorWallet(uint validatorId) public payable override {
        IValidatorService validatorService = IValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator does not exists");
        _validatorWallets[validatorId] = _validatorWallets[validatorId] + msg.value;
        emit ValidatorWalletRecharged(msg.sender, msg.value, validatorId);
    }

    /**
     * @dev Recharge the schain wallet by schainHash (hash of schain name).
     * 
     * Emits a {SchainWalletRecharged} event.
     * 
     * Requirements: 
     * - Given schain must be created
     */
    function rechargeSchainWallet(bytes32 schainHash) public payable override {
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isSchainActive(schainHash), "Schain should be active for recharging");
        _schainWallets[schainHash] = _schainWallets[schainHash] + msg.value;
        emit SchainWalletRecharged(msg.sender, msg.value, schainHash);
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }
}
