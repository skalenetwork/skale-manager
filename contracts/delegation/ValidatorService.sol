/*
    ValidatorService.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";


contract ValidatorService is Permissions {

    struct Validator {
        string name;
        address validatorAddress;
        string description;
        uint feeRate;
        uint registrationTime;
        uint minimumDelegationAmount;
        uint lastBountyCollectionMonth;
        uint[] nodeIndexes;
    }

    Validator[] public validators;
    mapping (address => uint) public validatorAddressToId;


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function registerValidator(
        string calldata name,
        address validatorAddress,
        string calldata description,
        uint feeRate,
        uint minimumDelegationAmount
    )
        external returns (uint validatorId)
    {
        uint[] memory epmtyArray = new uint[](0);
        validatorId = validators.length;
        validators.push(Validator(
            name,
            validatorAddress,
            description,
            feeRate,
            now,
            minimumDelegationAmount,
            0,
            epmtyArray
        ));
        validatorAddressToId[validatorAddress] = validatorId;
    }

    function setNewValidatorAddress(address newValidatorAddress, uint validatorId) external {
        require(
            validatorId == validatorAddressToId[msg.sender],
            "Sender Doesn't have permissions to change address for this validatorId"
        );
        validatorAddressToId[newValidatorAddress] = validatorId;
    }

    function checkMinimumDelegation(uint validatorId, uint amount) external returns (bool) {
        require(validatorId < validators.length, "Validator does not exist");
        return validators[validatorId].minimumDelegationAmount <= amount ? true : false;
    }

    function checkValidatorAddressToId(address validatorAddress, uint validatorId) external view returns (bool) {
        return getValidatorId(validatorAddress) == validatorId ? true : false;
    }

    function getValidatorNodeIndexes(uint validatorId) external view returns (uint[] memory) {
        return getValidator(validatorId).nodeIndexes;
    }

    function pushNode(uint validatorId, uint nodeIndex) external {
        // TODO: only validator can push node
        validators[validatorId].nodeIndexes.push(nodeIndex);
    }

    function getValidator(uint validatorId) public view returns (Validator memory) {
        require(checkValidatorExists(validatorId), "Validator does not exist");
        return validators[validatorId];
    }

    function getValidatorId(address validatorAddress) public view returns (uint) {
        require(
            validatorAddress == validators[validatorAddressToId[validatorAddress]].validatorAddress,
            "Validator with such address doesn't exist"
        );
        return validatorAddressToId[validatorAddress];
    }

    function checkValidatorExists(uint validatorId) public view returns (bool) {
        return validatorId < validators.length ? true : false;
    }

    // function createNode(address validatorAddress) external {
    //     uint validatorId = validatorAddressToId[validatorAddress];
    //     uint[] memory validatorNodes = validators[validatorId].nodeIndexes;
    //     for (uint i = 0; i < validato)
    //     // require(validators[validatorId].nodeIndexes.length * MSR <= )
    //     // msr
    //     // bond
    // }
}
