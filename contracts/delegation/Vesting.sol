pragma solidity ^0.5.3;

import "../interfaces/delegation/ILocker.sol";
import "./TimeHelpers.sol";

contract Vesting is ILocker, Permissions {

    struct SAFT {
        uint startVesting; // timestamp
        uint finishVesting; // timestamp
        uint lockupPeriod; // months
        uint fullAmount; // number
        uint afterLockupAmount; // number
        uint regularPaymentTime; // months
    }

    mapping (address => SAFT) saftHolders;

    function addVestingTerm(
        address holder,
        uint periodStarts, // timestamp
        uint lockupPeriod, // months
        uint fullPeriod, // months
        uint fullAmount, // number
        uint lockupAmount, // number
        uint vestingTimes // months
    )
        external
    {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        saftHolders[holder] = SAFT({
            startVesting: periodStarts,
            finishVesting: timeHelpers.addMonths(periodStarts, fullPeriod),
            lockupPeriod: lockupPeriod,
            fullAmount: fullAmount,
            afterLockupPeriod: lockupAmount,
            regularPaymentTime: vestingTimes
        });
    }

    function getLockedAmount(address wallet) external view returns (uint locked) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint date = block.timestamp;
        locked = saftHolders[wallet].fullAmount;
        if (date > timeHelpers.addMonths(periodStarts, saftHolders[wallet].lockupPeriod)) {
            
        }
    }

    function getAndUpdateLockedAmount(address wallet) external returns (uint) {

    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint) {

    }

    function initialize(address _contractManager) public initializer {
        Permissions.initialize(_contractManager);
    }

}