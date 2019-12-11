pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../delegation/DelegationController.sol";


contract DelegationControllerMock is DelegationController {

    // DelegationController.Delegation[] private _delegations;
    // mapping (address => uint[]) private _delegationsByHolder;

    // function getDelegationsByHolder(address holder) external view returns (uint[] memory) {
    //     return _delegationsByHolder[holder];
    // }

    // function getDelegation(uint delegationId) external view returns (DelegationController.Delegation memory) {
    //     require(delegationId < _delegations.length, "Delegation does not exist");
    //     return _delegations[delegationId];
    // }

    constructor(address _contractManager) DelegationController(_contractManager) public {

    }

    // for testing

    function createDelegation(uint validatorId, uint amount, uint delegationPeriod) external returns (uint delegationId) {
        // DelegationController.Delegation memory delegation = DelegationController.Delegation(
        //     validatorId, msg.sender, amount, 0, now, delegationPerios, false);

        // addDelegation(delegation);

        // addDelegation(DelegationController.Delegation(
        //     validatorId, msg.sender, amount, 0, now, delegationPerios, false));

        DelegationController.Delegation memory delegation = DelegationController.Delegation(
            validatorId,
            msg.sender,
            amount,
            0,
            now,
            delegationPeriod,
            false);

        addDelegation(delegation);
    }
}