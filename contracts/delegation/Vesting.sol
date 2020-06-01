/*
    Vesting.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
    @author Artem Payvin

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

pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "../interfaces/delegation/ILocker.sol";
import "../Permissions.sol";
import "./TimeHelpers.sol";
import "./DelegationController.sol";


contract Vesting is ILocker, Permissions, IERC777Recipient {

    struct SAFT {
        bool active;
        bool approved;
        bool isCancelable;
        uint startVestingTime; // timestamp
        uint finishVesting; // timestamp
        uint lockupPeriod; // months
        uint fullAmount; // number
        uint afterLockupAmount; // number
        uint regularPaymentTime; // months
    }

    IERC1820Registry private _erc1820;

    mapping (address => SAFT) private _saftHolders;
    mapping (address => bool) private _registeredSAFTHolders;
    mapping (address => uint) private _canceledTokens;

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external override
        allow("SkaleToken")
        // solhint-disable-next-line no-empty-blocks
    {

    }

    function approveSAFTHolder() external {
        require(_registeredSAFTHolders[msg.sender], "SAFT is not registered");
        require(!_saftHolders[msg.sender].approved, "SAFT is already approved");
        _saftHolders[msg.sender].approved = true;
    }

    function startVesting(address holder) external onlyOwner {
        require(_registeredSAFTHolders[holder], "SAFT is not registered");
        require(_saftHolders[holder].approved, "SAFT is not approved");
        require(_canceledTokens[holder] == 0, "SAFT is already canceled");
        _saftHolders[holder].active = true;
        require(
            IERC20(_contractManager.getContract("SkaleToken")).transfer(holder, _saftHolders[holder].fullAmount),
            "Error of token sending");
    }

    function changeVesting(
        address holder,
        uint periodStarts, // timestamp
        uint lockupPeriod, // months
        uint fullPeriod, // months
        uint vestingTimes // months
    )
        external
        onlyOwner
    {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        require(_registeredSAFTHolders[holder], "SAFT is not registered");
        require(_saftHolders[holder].startVestingTime != 0, "SAFT holder is not added");
        require(fullPeriod >= lockupPeriod, "Incorrect periods");
        require(
            (fullPeriod - lockupPeriod) == vestingTimes ||
            ((fullPeriod - lockupPeriod) / vestingTimes) * vestingTimes == fullPeriod - lockupPeriod,
            "Incorrect vesting times"
        );
        require(periodStarts <= now, "Incorrect period starts");
        _saftHolders[holder].finishVesting = timeHelpers.addMonths(periodStarts, fullPeriod);
        _saftHolders[holder].lockupPeriod = lockupPeriod;
        _saftHolders[holder].regularPaymentTime = vestingTimes;
    }

    function stopVesting(address holder) external onlyOwner {
        require(!_saftHolders[holder].active || _saftHolders[holder].isCancelable, "You could not stop vesting for holder");
        uint fullAmount = _saftHolders[holder].fullAmount;
        uint lockedAmount = getLockedAmount(holder);
        require(_canceledTokens[holder] == 0, "Already canceled");
        _canceledTokens[holder] = lockedAmount;
        _saftHolders[holder].active = false;
    }

    function addVestingTerm(
        address holder,
        uint periodStarts, // timestamp
        uint lockupPeriod, // months
        uint fullPeriod, // months
        uint fullAmount, // number
        uint lockupAmount, // number
        uint vestingTimes, // months
        bool cancelable
    )
        external
        onlyOwner
    {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        require(_saftHolders[holder].startVestingTime == 0, "SAFT holder is already added");
        require(fullPeriod >= lockupPeriod, "Incorrect periods");
        require(fullAmount >= lockupAmount, "Incorrect amounts");
        require(
            (fullPeriod - lockupPeriod) == vestingTimes ||
            ((fullPeriod - lockupPeriod) / vestingTimes) * vestingTimes == fullPeriod - lockupPeriod,
            "Incorrect vesting times"
        );
        require(periodStarts <= now, "Incorrect period starts");
        _registeredSAFTHolders[holder] = true;
        _saftHolders[holder] = SAFT({
            active: false,
            approved: false,
            isCancelable: cancelable,
            startVestingTime: periodStarts,
            finishVesting: timeHelpers.addMonths(periodStarts, fullPeriod),
            lockupPeriod: lockupPeriod,
            fullAmount: fullAmount,
            afterLockupAmount: lockupAmount,
            regularPaymentTime: vestingTimes
        });
        // require(
        //     IERC20(_contractManager.getContract("SkaleToken")).transfer(holder, fullAmount),
        //     "Error of token sending");
    }

    function getAndUpdateLockedAmount(address wallet) external override returns (uint) {
        return _canceledTokens[wallet] == 0 ? getLockedAmount(wallet) : _canceledTokens[wallet];
    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external override returns (uint) {
        return _canceledTokens[wallet];
    }

    function getLockedAmount(address wallet) public view returns (uint locked) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFT memory saftParams = _saftHolders[wallet];
        locked = saftParams.fullAmount;
        if (date >= timeHelpers.addMonths(saftParams.startVestingTime, saftParams.lockupPeriod)) {
            locked = locked.sub(saftParams.afterLockupAmount);
            if (date >= saftParams.finishVesting) {
                locked = 0;
            } else {
                uint partPayment = saftParams.fullAmount
                    .sub(saftParams.afterLockupAmount)
                    .div(_getNumberOfAllPayments(wallet));
                locked = locked.sub(partPayment.mul(_getNumberOfPayments(wallet)));
            }
        }
    }

    function initialize(address contractManager) public override initializer {
        Permissions.initialize(contractManager);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function getStartVestingTime(address holder) external view returns (uint) {
        return _saftHolders[holder].startVestingTime;
    }

    function getFinishVestingTime(address holder) external view returns (uint) {
        return _saftHolders[holder].finishVesting;
    }

    function getLockupPeriodInMonth(address holder) external view returns (uint) {
        return _saftHolders[holder].finishVesting;
    }

    function isActiveVestingTerm(address holder) external view returns (bool) {
        return _saftHolders[holder].active;
    }

    function isApprovedSAFT(address holder) external view returns (bool) {
        return _saftHolders[holder].approved;
    }

    function isSAFTRegistered(address holder) external view returns (bool) {
        return _registeredSAFTHolders[holder];
    }

    function isCancelableVestingTerm(address holder) external view returns (bool) {
        return _saftHolders[holder].isCancelable;
    }

    function getLockupPeriodTimestamp(address holder) external view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFT memory saftParams = _saftHolders[holder];
        return timeHelpers.addMonths(saftParams.startVestingTime, saftParams.lockupPeriod);
    }

    function getTimeOfNextPayment(address holder) external view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFT memory saftParams = _saftHolders[holder];
        uint lockupDate = timeHelpers.addMonths(saftParams.startVestingTime, saftParams.lockupPeriod);
        if (date < lockupDate) {
            return lockupDate;
        }
        uint dateMonth = timeHelpers.timestampToMonth(date);
        uint lockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVestingTime,
            saftParams.lockupPeriod
        ));
        uint finishMonth = timeHelpers.timestampToMonth(saftParams.finishVesting);
        uint numberOfDonePayments = dateMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
        uint numberOfAllPayments = finishMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
        if (numberOfAllPayments <= numberOfDonePayments + 1) {
            return saftParams.finishVesting;
        }
        uint nextPayment = dateMonth.add(1).sub(lockupMonth).div(saftParams.regularPaymentTime);
        return timeHelpers.addMonths(lockupDate, nextPayment);
    }

    function _getNumberOfPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFT memory saftParams = _saftHolders[wallet];
        if (date < timeHelpers.addMonths(saftParams.startVestingTime, saftParams.lockupPeriod)) {
            return 0;
        }
        uint dateMonth = timeHelpers.timestampToMonth(date);
        uint lockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVestingTime,
            saftParams.lockupPeriod
        ));
        return dateMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
    }

    function _getNumberOfAllPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFT memory saftParams = _saftHolders[wallet];
        uint finishMonth = timeHelpers.timestampToMonth(saftParams.finishVesting);
        uint afterLockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVestingTime,
            saftParams.lockupPeriod
        ));
        return finishMonth.sub(afterLockupMonth).div(saftParams.regularPaymentTime);
    }
}