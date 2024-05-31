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

import {Encoder} from "@skalenetwork/marionette-interfaces/Encoder.sol";
import {IMessageProxyForMainnet} from "@skalenetwork/ima-interfaces/mainnet/IMessageProxyForMainnet.sol";
import {IMarionette} from "@skalenetwork/marionette-interfaces/IMarionette.sol";
import {IPaymaster} from "@skalenetwork/paymaster-interfaces/IPaymaster.sol";

import {Permissions} from "./Permissions.sol";


/**
 * @title PaymasterController
 * @dev This contract serves to interact with Paymaster contract
 * on Europa chain.
 *
 */
contract PaymasterController is Permissions {
    IMessageProxyForMainnet public ima;
    IMarionette public marionette;
    IPaymaster public paymaster;
    bytes32 public europaChainHash;

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
        if (europaChainHash == 0) {
            revert EuropaChainHashIsNotSet();
        }
        _;
    }

    // TODO: restrict access
    function addSchain(string calldata name) external whenConfigured {
        _callPaymaster(abi.encodeWithSelector(
            paymaster.addSchain.selector,
            name
        ));
    }

    function _callPaymaster(bytes memory data) private whenConfigured {
        ima.postOutgoingMessage(
            europaChainHash,
            address(marionette),
            Encoder.encodeFunctionCall(
                address(paymaster),
                0,
                data
            )
        );
    }
}
