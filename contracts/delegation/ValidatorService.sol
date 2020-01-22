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
import "./DelegationController.sol";
import "../interfaces/IConstants.sol";


contract ValidatorService is Permissions {

    struct Validator {
        string name;
        address validatorAddress;
        address requestedAddress;
        string description;
        uint feeRate;
        uint registrationTime;
        uint minimumDelegationAmount;
        uint lastBountyCollectionMonth;
        uint[] nodeIndexes;
    }

    mapping (uint => Validator) public validators;
    mapping (address => uint) public validatorAddressToId;
    uint public numberOfValidators;

    modifier checkValidatorExists(uint validatorId) {
        require(validatorExists(validatorId), "Validator with such id doesn't exist");
        _;
    }

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function registerValidator(
        string calldata name,
        address validatorAddress,
        string calldata description,
        uint feeRate,
        uint minimumDelegationAmount
    )
        external
        allow("DelegationService")
        returns (uint validatorId)
    {
        require(validatorAddressToId[validatorAddress] == 0, "Validator with such address already exists");
        uint[] memory epmtyArray = new uint[](0);
        validatorId = ++numberOfValidators;
        validators[validatorId] = Validator(
            name,
            validatorAddress,
            address(0),
            description,
            feeRate,
            now,
            minimumDelegationAmount,
            0,
            epmtyArray
        );
        validatorAddressToId[validatorAddress] = validatorId;
    }

    function requestForNewAddress(address oldValidatorAddress, address newValidatorAddress) external allow("DelegationService") {
        require(newValidatorAddress != address(0), "New address cannot be null");
        uint validatorId = getValidatorId(oldValidatorAddress);
        validators[validatorId].requestedAddress = newValidatorAddress;
    }

    function confirmNewAddress(address newValidatorAddress, uint validatorId)
        external
        checkValidatorExists(validatorId)
        allow("DelegationService")
    {
        validatorAddressToId[validators[validatorId].validatorAddress] = 0;
        validators[validatorId].validatorAddress = newValidatorAddress;
        validators[validatorId].requestedAddress = address(0);
        validatorAddressToId[newValidatorAddress] = validatorId;
    }

    function checkMinimumDelegation(uint validatorId, uint amount)
        external
        checkValidatorExists(validatorId)
        allow("DelegationRequestManager")
        returns (bool)
    {
        return validators[validatorId].minimumDelegationAmount <= amount ? true : false;
    }

    function checkValidatorAddressToId(address validatorAddress, uint validatorId)
    external view
    allow("DelegationRequestManager") returns (bool)
    {
        return getValidatorId(validatorAddress) == validatorId ? true : false;
    }

    function getValidatorNodeIndexes(uint validatorId) external view returns (uint[] memory) {
        return getValidator(validatorId).nodeIndexes;
    }

    function pushNode(address validatorAddress, uint nodeIndex) external allow("SkaleManager") {
        uint validatorId = getValidatorId(validatorAddress);
        validators[validatorId].nodeIndexes.push(nodeIndex);
    }

    function checkPossibilityCreatingNode(address validatorAddress) external allow("SkaleManager") {
        DelegationController delegationController = DelegationController(
            contractManager.getContract("DelegationController")
        );
        uint validatorId = getValidatorId(validatorAddress);
        uint[] memory validatorNodes = validators[validatorId].nodeIndexes;
        uint delegationsTotal = delegationController.getDelegationsTotal(validatorId);
        uint msr = IConstants(contractManager.getContract("Constants")).msr();
        require((validatorNodes.length + 1) * msr <= delegationsTotal, "Validator has to meet Minimum Staking Requirement");
    }

    function validatorExists(uint validatorId) public view returns (bool) {
        return validatorId <= numberOfValidators;
    }

    function getValidator(uint validatorId) public view checkValidatorExists(validatorId) returns (Validator memory) {
        return validators[validatorId];
    }

    function getValidatorId(address validatorAddress) public view returns (uint) {
        require(validatorAddressToId[validatorAddress] != 0, "Validator with such address doesn't exist");
        return validatorAddressToId[validatorAddress];
    }


}
