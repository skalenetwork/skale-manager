pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";


contract Distributor is Permissions {

    struct Share {
        address holder;
        uint amount;
    }

    constructor (address _contractManager) public
    Permissions(_contractManager) {

    }

    function distributeWithFee(uint validatorId, uint amount, bool roundFloor) external returns (Share[] memory shares, uint fee) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        uint feeRate = validatorService.getValidator(validatorId).feeRate;

        shares = distribute(validatorId, amount - amount * feeRate / 1000, roundFloor);
        fee = amount;
        for (uint i = 0; i < shares.length; ++i) {
            fee -= shares[i].amount;
        }
    }

    function distribute(uint validatorId, uint amount, bool roundFloor) public returns (Share[] memory shares) {
        // DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        revert("distribute is not implemented");
    }
}