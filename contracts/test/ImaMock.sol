// SPDX-License-Identifier: AGPL-3.0-only

/*
    LockerMock.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
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

import { IMessageListener } from "@skalenetwork/ima-interfaces/IMessageListener.sol";

contract ImaMock is IMessageListener {
    event MessageProcessed(
        address sender,
        address destinationContract,
        bytes data
    );

    event MessageSent(
        bytes32 targetChainHash,
        address targetContract,
        bytes data
    );

    function postIncomingMessages(
        string calldata /* fromSchainName */,
        uint256 /* startingCounter */,
        Message[] calldata messages,
        Signature calldata /* sign */
    ) external override {
        for (uint256 i = 0; i < messages.length; ++i) {
            emit MessageProcessed(
                messages[i].sender,
                messages[i].destinationContract,
                messages[i].data
            );
        }
    }

    function postOutgoingMessage(
        bytes32 targetChainHash,
        address targetContract,
        bytes memory data
    ) external override {
        emit MessageSent(targetChainHash, targetContract, data);
    }
}
