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


    function rechargeValidatorWallet(uint validatorId) external payable {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(validatorService.validatorExists(validatorId), "Validator does not exists");
        validatorWallets[validatorId] = validatorWallets[validatorId].add(msg.value);
        emit ValidatorWalletRecharged(msg.sender, msg.value, validatorId);
    }

    function rechargeSchainWallet(bytes32 schainId) external payable {
        SchainsInternal schainsInternal = SchainsInternal(contractManager.getContract("SchainsInternal"));
        require(schainsInternal.isSchainActive(schainId), "Schain should be active for recharging");
        schainWallets[schainId] = schainWallets[schainId].add(msg.value);
        emit SchainWalletRecharged(msg.sender, msg.value, schainId);
    }

    function refundGasBySchain(bytes32 schainId, uint nodeIndex) external allow("SkaleDKG") {
        address payable node = payable(Nodes(contractManager.getContract("Nodes")).getNodeAddress(nodeIndex));
        uint weiSpent = tx.gasprice * (block.gaslimit - gasleft());
        reimburseGasBySchain(node, weiSpent, schainId);
    }

    function reimburseGasByValidator(address payable node, uint amount) external allow("SkaleManager") {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        uint validatorId = validatorService.getValidatorIdByNodeAddress(node);
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

    function reimburseGasBySchain(
        address payable node,
        uint amount,
        bytes32 schainId
    )
        public
        allowTwo("SkaleManager","SkaleDKG")
    {
        if (amount <= schainWallets[schainId]) {
            schainWallets[schainId] = schainWallets[schainId].sub(amount);
            emit NodeWalletReimbursed(node, amount);
            node.transfer(amount);
        } else {
            uint wholeAmount = schainWallets[schainId];
            // solhint-disable-next-line reentrancy
            schainWallets[schainId] = 0;
            emit NodeWalletReimbursed(node, wholeAmount);
            node.transfer(wholeAmount);
        }
    }

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
    }
}
