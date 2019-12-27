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
            msg.sender,
            description,
            feeRate,
            now,
            minimumDelegationAmount,
            0,
            epmtyArray
        ));
    }

    function setNewValidatorAddress(address newValidatorAddress, uint validatorId) external {
        require(
            validatorId == validatorAddressToId[msg.sender],
            "Sender Doesn't have permissions to change address for this validatorId"
        );
        validatorAddressToId[newValidatorAddress] = validatorId;
    }

    function checkValidatorExists(uint validatorId) external view returns (bool) {
        return validatorId < validators.length ? true : false;
    }

    function checkMinimumDelegation(uint validatorId, uint amount) external returns (bool) {
        return validators[validatorId].minimumDelegationAmount <= amount ? true : false;
    }

    function getValidatorId(address validatorAddress) external view returns (uint) {
        return validatorAddressToId[validatorAddress];
    }

    // function setValidatorFeeAddress(uint _validatorId, address _newAddress) public {
    //     require(msg.sender == validators[_validatorId].validatorAddress, "Transaction sender doesn't have enough permissions");
    //     validators[_validatorId].validatorFeeAddress = _newAddress;
    // }

    // function getValidatorFeeAddress(uint _validatorId) public view returns (address) {
    //     return validators[_validatorId].validatorFeeAddress;
    // }

    function checkValidatorAddressToId(address validatorAddress, uint validatorId) external view returns (bool) {
        return validatorAddressToId[validatorAddress] == validatorId ? true : false;
    }

    function createNode() external {
        // uint validatorId = validatorAddressToId[msg.sender];
        // require(validators[validatorId].nodeIndexes.length * MSR <= )
        // msr
        // bond
    }
}