pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "../interfaces/delegation/ILocker.sol";
import "../Permissions.sol";
import "./TimeHelpers.sol";


contract Vesting is ILocker, Permissions, IERC777Recipient {

    struct SAFT {
        uint startVesting; // timestamp
        uint finishVesting; // timestamp
        uint lockupPeriod; // months
        uint fullAmount; // number
        uint afterLockupAmount; // number
        uint regularPaymentTime; // months
    }

    IERC1820Registry private _erc1820;

    mapping (address => SAFT) private _saftHolders;

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
        onlyOwner
    {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        require(_saftHolders[holder].startVesting == 0, "SAFT holder is already added");
        require(fullPeriod >= lockupPeriod, "Incorrect periods");
        require(fullAmount >= lockupAmount, "Incorrect amounts");
        require(
            ((fullPeriod - lockupPeriod) / vestingTimes) * vestingTimes == fullPeriod - lockupPeriod,
            "Incorrect vesting times"
        );
        require(periodStarts <= now, "Incorrect period starts");
        _saftHolders[holder] = SAFT({
            startVesting: periodStarts,
            finishVesting: timeHelpers.addMonths(periodStarts, fullPeriod),
            lockupPeriod: lockupPeriod,
            fullAmount: fullAmount,
            afterLockupAmount: lockupAmount,
            regularPaymentTime: vestingTimes
        });
        require(
            IERC20(_contractManager.getContract("SkaleToken")).transfer(holder, fullAmount),
            "Error of token sending");
    }

    function getAndUpdateLockedAmount(address wallet) external override returns (uint) {
        return this.getLockedAmount(wallet);
    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external override returns (uint) {
        return 0;
    }

    function getLockedAmount(address wallet) external view returns (uint locked) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFT memory saftParams = _saftHolders[wallet];
        locked = saftParams.fullAmount;
        if (date >= timeHelpers.addMonths(saftParams.startVesting, saftParams.lockupPeriod)) {
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

    function _getNumberOfPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        uint date = now;
        SAFT memory saftParams = _saftHolders[wallet];
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

    function _getNumberOfAllPayments(address wallet) internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(_contractManager.getContract("TimeHelpers"));
        SAFT memory saftParams = _saftHolders[wallet];
        uint finishMonth = timeHelpers.timestampToMonth(saftParams.finishVesting);
        uint afterLockupMonth = timeHelpers.timestampToMonth(timeHelpers.addMonths(
            saftParams.startVesting,
            saftParams.lockupPeriod
        ));
        return finishMonth.sub(afterLockupMonth).div(saftParams.regularPaymentTime);
    }
}