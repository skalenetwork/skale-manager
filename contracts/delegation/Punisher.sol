pragma solidity ^0.5.3;

import "../Permissions.sol";
import "../interfaces/delegation/ILocker.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";


contract Punisher is Permissions, ILocker {

    //        holder => tokens
    mapping (address => uint) private _locked;

    /// @notice Allows service to slash `validator` by `amount` of tokens
    function slash(uint validatorId, uint amount) external allow("SkaleDKG") {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(validatorService.validatorExists(validatorId), "Validator does not exist");

        delegationController.confiscate(validatorId, amount);
    }

    function forgive(address holder, uint amount) external onlyOwner {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));

        require(!delegationController.hasUnprocessedSlashes(holder), "Not all slashes were calculated");

        if (amount > _locked[holder]) {
            delete _locked[holder];
        } else {
            _locked[holder] -= amount;
        }
    }

    function calculateLockedAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function handleSlash(address holder, uint amount) external allow("DelegationController") {
        _locked[holder] += amount;
    }

    function initialize(address _contractManager) public initializer {
        Permissions.initialize(_contractManager);
    }

    // private

    function _calculateLockedAmount(address wallet) internal view returns (uint) {
        return _locked[wallet];
    }

}