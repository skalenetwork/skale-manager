// SPDX-License-Identifier: AGPL-3.0-only

/*
    ISchainsFunctionality.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Dmytro Stebaiev
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

pragma solidity 0.6.8;

interface ISchainsFunctionality {
    function addSchain(address from, uint value, bytes calldata data) external;
    function deleteSchain(address from, string calldata name) external;
    function deleteSchainByRoot(string calldata name) external;
    function rotateNode(uint nodeIndex, bytes32 schainId) external returns (uint);
    function exitFromSchain(uint nodeIndex) external returns (bool);
}