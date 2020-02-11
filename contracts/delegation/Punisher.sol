pragma solidity ^0.5.3;

import "../Permissions.sol";
import "../interfaces/delegation/ILocker.sol";
import "./ValidatorService.sol";


contract Punisher is Permissions, ILocker {

    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(uint validatorId, uint amount) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));

        require(validatorService.validatorExists(validatorId), "Validator does not exist");
    }

    function calculateLockedAmount(address wallet) external returns (uint) {
        return 0;
    }

    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return 0;
    }

    function initialize(address _contractManager) public initializer {
        Permissions.initialize(_contractManager);
    }

}