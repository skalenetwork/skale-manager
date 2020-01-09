pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";
import "./DelegationPeriodManager.sol";


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
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        uint totalDelegated = 0;
        uint[] memory activeDelegations = delegationController.getActiveDelegationsByValidator(validatorId);
        shares = new Share[](activeDelegations.length);

        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));
        for (uint i = 0; i < activeDelegations.length; ++i) {
            DelegationController.Delegation memory delegation = delegationController.getDelegation(activeDelegations[i]);
            shares[i].holder = delegation.holder;
            uint multiplier = delegationPeriodManager.stakeMultipliers(delegation.delegationPeriod);
            shares[i].amount = amount * delegation.amount * multiplier;
            totalDelegated += delegation.amount * multiplier;
        }

        for (uint i = 0; i < activeDelegations.length; ++i) {
            uint value = shares[i].amount;
            shares[i].amount /= totalDelegated;
            if (!roundFloor) {
                if (shares[i].amount * totalDelegated < value) {
                    ++shares[i].amount;
                }
            }
        }
    }
}