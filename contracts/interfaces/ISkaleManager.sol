// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISkaleManager.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
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

pragma solidity >=0.6.10 <0.9.0;

interface ISkaleManager {
    /**
     * @dev Emitted when the version was updated
     */
    event VersionUpdated(string oldVersion, string newVersion);

    /**
     * @dev Emitted when bounty is received.
     */
    event BountyReceived(
        uint indexed nodeIndex,
        address owner,
        uint averageDowntime,
        uint averageLatency,
        uint bounty,
        uint previousBlockEvent
    );
    
    function createNode(
        uint16 port,
        uint16 nonce,
        bytes4 ip,
        bytes4 publicIp,
        bytes32[2] calldata publicKey,
        string calldata name,
        string calldata domainName
    )
        external;
    function nodeExit(uint nodeIndex) external;
    function deleteSchain(string calldata name) external;
    function deleteSchainByRoot(string calldata name) external;
    function getBounty(uint nodeIndex) external;
    function setVersion(string calldata newVersion) external;
}
