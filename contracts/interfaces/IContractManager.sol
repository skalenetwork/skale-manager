// SPDX-License-Identifier: AGPL-3.0-only

/*
    IContractManager.sol - SKALE Manager Interfaces
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

interface IContractManager {
    /**
     * @dev Emitted when contract is upgraded.
     */
    event ContractUpgraded(string contractsName, address contractsAddress);

    function initialize() external;
    function setContractsAddress(string calldata contractsName, address newContractsAddress) external;
    function contracts(bytes32 nameHash) external view returns (address);
    function getDelegationPeriodManager() external view returns (address);
    function getBounty() external view returns (address);
    function getValidatorService() external view returns (address);
    function getTimeHelpers() external view returns (address);
    function getConstantsHolder() external view returns (address);
    function getSkaleToken() external view returns (address);
    function getTokenState() external view returns (address);
    function getPunisher() external view returns (address);
    function getContract(string calldata name) external view returns (address);
}