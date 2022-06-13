// SPDX-License-Identifier: AGPL-3.0-only

/*
    IWallets - SKALE Manager Interfaces
    Copyright (C) 2021-Present SKALE Labs
    @author Dmytro Stebaiev

    SKALE Manager Interfaces is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager Interfaces is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager Interfaces.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.6.10 <0.9.0;

interface IWallets {
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

    receive() external payable;
    function refundGasByValidator(uint validatorId, address payable spender, uint spentGas) external;
    function refundGasByValidatorToSchain(uint validatorId, bytes32 schainHash) external;
    function refundGasBySchain(bytes32 schainId, address payable spender, uint spentGas, bool isDebt) external;
    function withdrawFundsFromSchainWallet(address payable schainOwner, bytes32 schainHash) external;
    function withdrawFundsFromValidatorWallet(uint amount) external;
    function rechargeValidatorWallet(uint validatorId) external payable;
    function rechargeSchainWallet(bytes32 schainId) external payable;
    function getSchainBalance(bytes32 schainHash) external view returns (uint);
    function getValidatorBalance(uint validatorId) external view returns (uint);
}
