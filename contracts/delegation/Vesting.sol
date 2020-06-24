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
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "../interfaces/delegation/ILocker.sol";
import "../Permissions.sol";
import "./TimeHelpers.sol";
import "./DelegationController.sol";
import "./VestingEscrow.sol";


contract Vesting is ILocker, Permissions, IERC777Recipient {

    struct SAFT {
        uint fullPeriod;
        uint lockupPeriod; // months
        uint regularPaymentTime; // months
        bool isCancelable;
    }

    struct SAFTHolder {
        bool registered;
        bool approved;
        bool active;
        uint saftRound;
        uint startVestingTime;
        uint fullAmount;
        uint afterLockupAmount;
    }

    IERC1820Registry private _erc1820;

    // array of SAFT configs
    SAFT[] private _saftRounds;

    // number of SAFT Round => amount of holders connected
    // mapping (uint => uint) private _usedSAFTRounds;

    //        holder => SAFT holder params
    mapping (address => SAFTHolder) private _saftHolders;

    //        holder => address of vesting escrow
    mapping (address => address) private _holderToEscrow;

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
        address holder = msg.sender;
        require(_saftHolders[holder].registered, "SAFT is not registered");
        require(!_saftHolders[holder].approved, "SAFT is already approved");
        _saftHolders[holder].approved = true;
    }

    function startVesting(address holder) external onlyOwner {
        require(_saftHolders[holder].registered, "SAFT is not registered");
        require(_saftHolders[holder].approved, "SAFT is not approved");
        _saftHolders[holder].active = true;
        // _usedSAFTRounds[_saftHolders[holder].saftRound - 1]++;
        require(
            IERC20(_contractManager.getContract("SkaleToken")).transfer(
                _holderToEscrow[holder],
                _saftHolders[holder].fullAmount
            ),
            "Error of token sending"
        );
    }

    function addSAFTRound(
        uint lockupPeriod, // months
        uint fullPeriod, // months
        uint vestingTimes, // months
        bool isCancelable
    )
        external
        onlyOwner
    {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        require(fullPeriod >= lockupPeriod, "Incorrect periods");
        require(
            (fullPeriod - lockupPeriod) == vestingTimes ||
            ((fullPeriod - lockupPeriod) / vestingTimes) * vestingTimes == fullPeriod - lockupPeriod,
            "Incorrect vesting times"
        );
        _saftRounds.push(SAFT({
            fullPeriod: fullPeriod,
            lockupPeriod: lockupPeriod,
            regularPaymentTime: vestingTimes,
            isCancelable: isCancelable
        }));
    }

    function stopVesting(address holder) external onlyOwner {
        require(
            !_saftHolders[holder].active || _saftRounds[_saftHolders[holder].saftRound].isCancelable,
            "You could not stop vesting for this holder"
        );
        VestingEscrow vestingEscrow = VestingEscrow(_holderToEscrow[holder]);
        vestingEscrow.cancelVesting();
    }

    function connectHolderToSAFT(
        address holder,
        uint saftRound,
        uint startVestingTime, //timestamp
        uint fullAmount,
        uint lockupAmount
    )
        external
        onlyOwner
    {
        require(_saftRounds.length >= saftRound, "SAFT round does not exist");
        require(fullAmount >= lockupAmount, "Incorrect amounts");
        require(startVestingTime <= now, "Incorrect period starts");
        require(!_saftHolders[holder].registered, "SAFT holder is already added");
        _saftHolders[holder] = SAFTHolder({
            registered: true,
            approved: false,
            active: false,
            saftRound: saftRound,
            startVestingTime: startVestingTime,
            fullAmount: fullAmount,
            afterLockupAmount: lockupAmount
        });
        // VestingEscrow vestingEscrow = new VestingEscrow(address(_contractManager), holder);
        _holderToEscrow[holder] = address(new VestingEscrow(address(_contractManager), holder));
    }

    function getAndUpdateLockedAmount(address wallet) external override returns (uint) {
        if (! _saftHolders[wallet].active) {
            return 0;
        }
        return getLockedAmount(wallet);
    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external override returns (uint) {
        // metwork_launch_timestamp
        return 0;
    }

    function getStartVestingTime(address holder) external view returns (uint) {
        return _saftHolders[holder].startVestingTime;
    }

    function getFinishVestingTime(address holder) external view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFTHolder memory saftHolder = _saftHolders[holder];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        return timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.fullPeriod);
    }

    function getLockupPeriodInMonth(address holder) external view returns (uint) {
        return _saftRounds[_saftHolders[holder].saftRound - 1].lockupPeriod;
    }

    function isActiveVestingTerm(address holder) external view returns (bool) {
        return _saftHolders[holder].active;
    }

    function isApprovedSAFT(address holder) external view returns (bool) {
        return _saftHolders[holder].approved;
    }

    function isSAFTRegistered(address holder) external view returns (bool) {
        return _saftHolders[holder].registered;
    }

    function isCancelableVestingTerm(address holder) external view returns (bool) {
        return _saftRounds[_saftHolders[holder].saftRound - 1].isCancelable;
    }

    function getFullAmount(address holder) external view returns (uint) {
        return _saftHolders[holder].fullAmount;
    }

    function getLockupPeriodTimestamp(address holder) external view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFTHolder memory saftHolder = _saftHolders[holder];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        return timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.lockupPeriod);
    }

    function getTimeOfNextPayment(address holder) external view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFTHolder memory saftHolder = _saftHolders[holder];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        uint lockupDate = timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.lockupPeriod);
        if (date < lockupDate) {
            return lockupDate;
        }
        uint dateMonth = timeHelpers.timestampToMonth(date);
        uint lockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftHolder.startVestingTime,
            saftParams.lockupPeriod
        ));
        uint finishMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftHolder.startVestingTime,
            saftParams.fullPeriod
        ));
        uint numberOfDonePayments = dateMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
        uint numberOfAllPayments = finishMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
        if (numberOfAllPayments <= numberOfDonePayments + 1) {
            return timeHelpers.addMonths(
                saftHolder.startVestingTime,
                saftParams.fullPeriod
            );
        }
        uint nextPayment = dateMonth.add(1).sub(lockupMonth).div(saftParams.regularPaymentTime);
        return timeHelpers.addMonths(lockupDate, nextPayment);
    }

    function getSAFTRound(uint saftRound) external view returns (SAFT memory) {
        require(saftRound < _saftRounds.length, "SAFT Round does not exist");
        return _saftRounds[saftRound];
    }

    function getSAFTHolderParams(address holder) external view returns (SAFTHolder memory) {
        require(_saftHolders[holder].registered, "SAFT holder is not registered");
        return _saftHolders[holder];
    }

    function initialize(address contractManager) public override initializer {
        Permissions.initialize(contractManager);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function getLockedAmount(address wallet) public view returns (uint) {
        return _saftHolders[wallet].fullAmount - calculateAvailableAmount(wallet);
    }

    function calculateAvailableAmount(address wallet) public view returns (uint availableAmount) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFTHolder memory saftHolder = _saftHolders[wallet];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        availableAmount = 0;
        if (date >= timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.lockupPeriod)) {
            availableAmount = saftHolder.afterLockupAmount;
            if (date >= timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.fullPeriod)) {
                availableAmount = saftHolder.fullAmount;
            } else {
                uint partPayment = saftHolder.fullAmount
                    .sub(saftHolder.afterLockupAmount)
                    .div(_getNumberOfAllPayments(wallet));
                availableAmount = availableAmount.add(partPayment.mul(_getNumberOfPayments(wallet)));
            }
        }
    }

    function _getNumberOfPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFTHolder memory saftHolder = _saftHolders[wallet];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        if (date < timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.lockupPeriod)) {
            return 0;
        }
        uint dateMonth = timeHelpers.timestampToMonth(date);
        uint lockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftHolder.startVestingTime,
            saftParams.lockupPeriod
        ));
        return dateMonth.sub(lockupMonth).div(saftParams.regularPaymentTime);
    }

    function _getNumberOfAllPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFTHolder memory saftHolder = _saftHolders[wallet];
        SAFT memory saftParams = _saftRounds[saftHolder.saftRound - 1];
        uint finishMonth = timeHelpers.timestampToMonth(
            timeHelpers.addMonths(saftHolder.startVestingTime, saftParams.fullPeriod)
        );
        uint afterLockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftHolder.startVestingTime,
            saftParams.lockupPeriod
        ));
        return finishMonth.sub(afterLockupMonth).div(saftParams.regularPaymentTime);
    }
}