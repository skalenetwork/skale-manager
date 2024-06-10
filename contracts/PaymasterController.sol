// SPDX-License-Identifier: AGPL-3.0-only

/*
    PaymasterController.sol - SKALE Manager
    Copyright (C) 2024-Present SKALE Labs
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

pragma solidity 0.8.26;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {Encoder} from "@skalenetwork/marionette-interfaces/Encoder.sol";
import {IMessageProxyForMainnet} from "@skalenetwork/ima-interfaces/mainnet/IMessageProxyForMainnet.sol";
import {IMarionette} from "@skalenetwork/marionette-interfaces/IMarionette.sol";
import {IPaymaster} from "@skalenetwork/paymaster-interfaces/IPaymaster.sol";
import {IPaymasterController} from "@skalenetwork/skale-manager-interfaces/IPaymasterController.sol";

import {IsNotContract, RoleRequired} from "./CommonErrors.sol";
import {Permissions} from "./Permissions.sol";


/**
 * @title PaymasterController
 * @dev This contract serves to interact with Paymaster contract
 * on Europa chain.
 *
 */
contract PaymasterController is IPaymasterController, Permissions {
    using AddressUpgradeable for address;
    using AddressUpgradeable for address payable;

    bytes32 public constant PAYMASTER_SETTER_ROLE = keccak256("PAYMASTER_SETTER_ROLE");

    IMessageProxyForMainnet public ima;
    IMarionette public marionette;
    IPaymaster public paymaster;
    bytes32 public paymasterChainHash;

    error MessageProxyForMainnetAddressIsNotSet();
    error MarionetteAddressIsNotSet();
    error PaymasterAddressIsNotSet();
    error EuropaChainHashIsNotSet();

    modifier whenConfigured() {
        if (address(ima) == address(0)) {
            revert MessageProxyForMainnetAddressIsNotSet();
        }
        if (address(marionette) == address(0)) {
            revert MarionetteAddressIsNotSet();
        }
        if (address(paymaster) == address(0)) {
            revert PaymasterAddressIsNotSet();
        }
        if (paymasterChainHash == 0) {
            revert EuropaChainHashIsNotSet();
        }
        _;
    }

    modifier onlyPaymasterSetter() {
        if (!hasRole(PAYMASTER_SETTER_ROLE, msg.sender)) {
            revert RoleRequired(PAYMASTER_SETTER_ROLE);
        }
        _;
    }

    function initialize(address contractManagerAddress) public override initializer {
        Permissions.initialize(contractManagerAddress);
        _setupRole(PAYMASTER_SETTER_ROLE, msg.sender);
    }

    function setImaAddress(address imaAddress) external override onlyPaymasterSetter {
        if (!imaAddress.isContract()) {
            revert IsNotContract(imaAddress);
        }
        ima = IMessageProxyForMainnet(imaAddress);
    }

    function setMarionetteAddress(address payable marionetteAddress) external override onlyPaymasterSetter {
        if (!marionetteAddress.isContract()) {
            revert IsNotContract(marionetteAddress);
        }
        marionette = IMarionette(marionetteAddress);
    }

    function setPaymasterAddress(address paymasterAddress) external override onlyPaymasterSetter {
        if (!paymasterAddress.isContract()) {
            revert IsNotContract(paymasterAddress);
        }
        paymaster = IPaymaster(paymasterAddress);
    }

    function setPaymasterChainHash(bytes32 chainHash) external override onlyPaymasterSetter {
        paymasterChainHash = chainHash;
    }

    function addSchain(string calldata name) external override allow("Schains") {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.addSchain.selector,
            name
        ));
    }

    function removeSchain(bytes32 schainHash) external override allow("Schains") {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.removeSchain.selector,
            schainHash
        ));
    }

    function _callPaymaster(bytes memory data) private whenConfigured {
        ima.postOutgoingMessage(
            paymasterChainHash,
            address(marionette),
            Encoder.encodeFunctionCall(
                address(paymaster),
                0,
                data
            )
        );
    }
}
