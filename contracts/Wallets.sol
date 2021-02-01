// SPDX-License-Identifier: AGPL-3.0-only

/*
    Wallets.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Dmytro Stebaiev
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

import "./Permissions.sol";
import "./delegation/ValidatorService.sol";
import "./SchainsInternal.sol";
import "./Nodes.sol";

contract Wallets is Permissions {

    mapping (uint => uint) public validatorWallets;
    mapping (bytes32 => uint) public schainWallets;

    event ValidatorWalletRecharged(address sponsor, uint amount, uint validatorId);
    event SchainWalletRecharged(address sponsor, uint amount, bytes32 schainId);
    event NodeWalletReimbursed(address node, uint amount);

    /**
     * @notice Recharge the validator wallet by id
     * @param validatorId - id of existing validator
     * @dev
     * Requirements: 
     * - Given validator must exist
     */
    function rechargeValidatorWallet(uint validatorId) external payable {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator does not exists");
        validatorWallets[validatorId] = validatorWallets[validatorId].add(msg.value);
        emit ValidatorWalletRecharged(msg.sender, msg.value, validatorId);
    }

    /**
     * @notice Recharge the schain wallet by schainId (hash of schain name)
     * @param schainId - id of existing schain
     * @dev
     * Requirements: 
     * - Given schain must be created
     */
    function rechargeSchainWallet(bytes32 schainId) external payable {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isSchainActive(schainId), "Schain should be active for recharging");
        schainWallets[schainId] = schainWallets[schainId].add(msg.value);
        emit SchainWalletRecharged(msg.sender, msg.value, schainId);
    }

    /**
     * @notice Reimburse gas for node by validator wallet. If validator wallet has not enough funds 
     * the node will receive the entire remaining amount in the validator's wallet
     * @param validatorId - validator that will reimburse desired transaction
     * @param nodeIndex - index of node that will get refunding by validator
     * @param spentGas - amount of spent gas that should be reimbursed to desired node
     * @dev
     * Requirements: 
     * - Given validator should exist
     */
    function refundGasByValidator(
        uint validatorId,
        uint nodeIndex,
        uint spentGas
    )
        external
        allowTwo("SkaleManager", "SkaleDKG")
    {
        address payable node = payable(Nodes(contractManager.getContract("Nodes")).getNodeAddress(nodeIndex));
        require(validatorId != 0, "ValidatorId could not be zero");
        uint amount = tx.gasprice * spentGas;
        if (amount <= validatorWallets[validatorId]) {
            validatorWallets[validatorId] = validatorWallets[validatorId].sub(amount);
            emit NodeWalletReimbursed(node, amount);
            node.transfer(amount);
        } else {
            uint wholeAmount = validatorWallets[validatorId];
            // solhint-disable-next-line reentrancy
            validatorWallets[validatorId] = 0;
            emit NodeWalletReimbursed(node, wholeAmount);
            node.transfer(wholeAmount);
        }
    }

    /**
     * @notice Reimburse gas for node by schain wallet. If schain wallet has not enough funds 
     * than transaction will be reverted
     * @param schainId - schain that will reimburse desired transaction
     * @param nodeIndex - node that will get refunding by schain
     * @param spentGas - amount of spent gas that should be reimbursed to desired node
     * @dev
     * Requirements: 
     * - Given schain should exist
     * - Schain wallet should have enough funds
     */
    function refundGasBySchain(
        bytes32 schainId,
        uint nodeIndex,
        uint spentGas
    )
        external
        allow("SkaleDKG")
    {
        address payable node = payable(Nodes(contractManager.getContract("Nodes")).getNodeAddress(nodeIndex));
        uint amount = tx.gasprice * spentGas;
        require(schainId != bytes32(0), "SchainId cannot be null");
        require(amount <= schainWallets[schainId], "Schain wallet has not enough funds");
        schainWallets[schainId] = schainWallets[schainId].sub(amount);
        emit NodeWalletReimbursed(node, amount);
        node.transfer(amount);
    }


    /**
     * @notice Withdraws money from schain wallet. Possible to execute only after deleting schain
     * @param schainOwner - address of schain owner that will receive rest of the schain balance
     * @param schainId - schain wallet from which money is withdrawn
     * @dev
     * Requirements: 
     * - Executable only after initing delete schain
     */
    function withdrawFundsFromSchainWallet(address payable schainOwner, bytes32 schainId) external allow("Schains") {
        uint amount = schainWallets[schainId];
        delete schainWallets[schainId];
        schainOwner.transfer(amount);
    }
    
    /**
     * @notice Withdraws money from vaildator wallet
     * @param amount - the amount of money in wei
     * @dev
     * Requirements: 
     * - Validator must have sufficient withdrawal amount
     */
    function withdrawFundsFromValidatorWallet(uint amount) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        uint validatorId = validatorService.getValidatorId(msg.sender);
        require(amount <= validatorWallets[validatorId], "Validator wallet has not enough funds");
        validatorWallets[validatorId] = validatorWallets[validatorId].sub(amount);
        msg.sender.transfer(amount);
    }

    function getSchainBalance(bytes32 schainId) external view returns (uint) {
        return schainWallets[schainId];
    }

    function getValidatorBalance(uint validatorId) external view returns (uint) {
        return validatorWallets[validatorId];
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }
}
