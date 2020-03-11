pragma solidity ^0.5.3;

import "../interfaces/delegation/ILocker.sol";
import "../Permissions.sol";
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
            afterLockupAmount: lockupAmount,
            regularPaymentTime: vestingTimes
        });
    }

    function getLockedAmount(address wallet) external view returns (uint locked) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint date = block.timestamp;
        SAFT memory saftParams = saftHolders[wallet];
        locked = saftParams.fullAmount;
        if (date > timeHelpers.addMonths(saftParams.startVesting, saftParams.lockupPeriod)) {
            locked = locked.sub(saftParams.afterLockupAmount);
            if (date > saftParams.finishVesting) {
                locked = 0;
            } else {
                uint numberOfPayments = getNumberOfPayments(wallet);
                uint partPayment = saftParams.fullAmount.sub(saftParams.afterLockupAmount).div(getNumberOfAllPayments(wallet));
                locked = locked.sub(partPayment.mul(numberOfPayments));
            }
        }
    }

    function getAndUpdateLockedAmount(address wallet) external returns (uint) {
        return this.getLockedAmount(wallet);
    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return this.getLockedAmount(wallet);
    }

    function initialize(address _contractManager) public initializer {
        Permissions.initialize(_contractManager);
    }

    function getNumberOfPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        uint date = block.timestamp;
        SAFT memory saftParams = saftHolders[wallet];
        if (date < timeHelpers.addMonths(saftParams.startVesting, saftParams.lockupPeriod)) {
            return 0;
        }
        uint dateMonth = timeHelpers.timestampToMonth(date);
        uint lockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVesting,
            saftParams.lockupPeriod
        ));
        return dateMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
    }

    function getNumberOfAllPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        SAFT memory saftParams = saftHolders[wallet];
        uint finishMonth = timeHelpers.timestampToMonth(saftParams.finishVesting);
        uint afterLockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVesting,
            saftParams.lockupPeriod
        ));
        return finishMonth.sub(afterLockupMonth).div(saftParams.regularPaymentTime);
    }
}