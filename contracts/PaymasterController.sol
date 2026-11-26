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

pragma solidity 0.8.35;

import {
    AddressUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import { Encoder } from "@skalenetwork/marionette-interfaces/Encoder.sol";
import {
    IMessageProxyForMainnet
} from "@skalenetwork/ima-interfaces/mainnet/IMessageProxyForMainnet.sol";
import { IMarionette } from "@skalenetwork/marionette-interfaces/IMarionette.sol";
import { IPaymaster } from "@skalenetwork/paymaster-interfaces/IPaymaster.sol";
import {
    IPaymasterController
} from "@skalenetwork/skale-manager-interfaces/IPaymasterController.sol";

import { IsNotContract, RoleRequired } from "./CommonErrors.sol";
import { Permissions } from "./Permissions.sol";


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

    function setMarionetteAddress(
        address payable marionetteAddress
    )
        external
        override
        onlyPaymasterSetter
    {
        marionette = IMarionette(marionetteAddress);
    }

    function setPaymasterAddress(address paymasterAddress) external override onlyPaymasterSetter {
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

    function addValidator(
        uint256 validatorId,
        address validatorAddress
    )
        external
        override
        allow("ValidatorService")
    {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.addValidator.selector,
            validatorId,
            validatorAddress
        ));
    }

    function setValidatorAddress(
        uint256 validatorId,
        address validatorAddress
    )
        external
        override
        allow("ValidatorService")
    {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.setValidatorAddress.selector,
            validatorId,
            validatorAddress
        ));
    }

    function setNodesAmount(
        uint256 validatorId,
        uint256 nodesAmount
    )
        external
        override
        allow("Nodes")
    {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.setNodesAmount.selector,
            validatorId,
            nodesAmount
        ));
    }

    function _callPaymaster(bytes memory data) private {
        address imaAddress = address(ima);
        address marionetteAddress = address(marionette);
        address paymasterAddress = address(paymaster);
        bytes32 chainHash = paymasterChainHash;

        if (_isFreshDeployment(imaAddress, marionetteAddress, paymasterAddress, chainHash)) {
            // Bypass of fresh deployments
            return;
        }

        _checkConfigs(imaAddress, marionetteAddress, paymasterAddress, chainHash);

        ima.postOutgoingMessage(
            chainHash,
            marionetteAddress,
            Encoder.encodeFunctionCall(
                paymasterAddress,
                0,
                data
            )
        );
    }

    function _checkConfigs (
        address imaAddress,
        address marionetteAddress,
        address paymasterAddress,
        bytes32 chainHash
    ) private pure {
        if (imaAddress == address(0)) {
            revert MessageProxyForMainnetAddressIsNotSet();
        }
        if (marionetteAddress == address(0)) {
            revert MarionetteAddressIsNotSet();
        }
        if (paymasterAddress == address(0)) {
            revert PaymasterAddressIsNotSet();
        }
        if (chainHash == 0) {
            revert EuropaChainHashIsNotSet();
        }
    }

    function _isFreshDeployment (
        address imaAddress,
        address marionetteAddress,
        address paymasterAddress,
        bytes32 chainHash
    ) private pure returns (bool) {
        return (
            imaAddress == address(0) &&
            marionetteAddress == address(0) &&
            paymasterAddress == address(0) &&
            chainHash == 0
        );
    }
}
