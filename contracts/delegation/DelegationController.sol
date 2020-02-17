/*
    DelegationController.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky

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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "../Permissions.sol";
import "./DelegationPeriodManager.sol";
import "./TokenState.sol";
import "./ValidatorService.sol";
import "./TokenLaunchLocker.sol";


contract DelegationController is Permissions, ILocker {

    enum State {
        PROPOSED,
        ACCEPTED,
        CANCELED,
        REJECTED,
        DELEGATED,
        UNDELEGATION_REQUESTED,
        COMPLETED
    }

    struct Delegation {
        address holder; // address of tokens owner
        uint validatorId;
        uint amount;
        uint delegationPeriod;
        uint created; // time of creation
        uint started; // month of a delegation becomes active
        uint finished; // first month after a delegation ends
        string info;
    }

    struct PartialDifferences {
             // month => diff
        mapping (uint => uint) addDiff;
             // month => diff
        mapping (uint => uint) subtractDiff;
             // month => value
        mapping (uint => uint) value;

        uint firstUnprocessedMonth;
    }

    struct PartialDifferencesValue {
             // month => diff
        mapping (uint => uint) addDiff;
             // month => diff
        mapping (uint => uint) subtractDiff;

        uint value;
        uint firstUnprocessedMonth;
        uint lastChangedMonth;
    }

    struct Fraction {
        uint numerator;
        uint denominator;
    }

    struct SlashingEvent {
        Fraction reducingCoefficient;
        uint nextMonth;
    }

    struct SlashingLog {
        //      month => slashing event
        mapping (uint => SlashingEvent) slashes;
        uint firstMonth;
        uint lastMonth;
    }

    struct DelegationExtras {
        uint lastSlashingMonthBeforeDelegation;
    }

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    // delegationId => extras
    mapping(uint => DelegationExtras) private _delegationExtras;

    // ///       holder => delegationId[]
    // mapping (address => uint[]) private _activeByHolder;

    // /// validatorId => delegationId[]
    // mapping (uint => uint[]) private _activeByValidator;

    // validatorId => sequence
    mapping (uint => PartialDifferencesValue) private _delegatedToValidator;
    // validatorId => sequence
    mapping (uint => PartialDifferences) private _effectiveDelegatedToValidator;

    mapping (uint => SlashingLog) private _slashesOfValidator;

    //        holder => sequence
    mapping (address => PartialDifferencesValue) private _delegatedByHolder;

    //        holder =>   validatorId => month
    mapping (address => mapping (uint => uint)) private _firstDelegationMonth;

    //        holder =>   validatorId => sequence
    mapping (address => mapping (uint => PartialDifferences)) private _effectiveDelegatedByHolderToValidator;

    //        holder => tokens
    mapping (address => uint) private _lockedInPendingRequests;
    //        holder => month
    mapping (address => uint) private _lastWriteTolockedInPendingRequests;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    function getDelegation(uint delegationId) external view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

    function calculateDelegatedToValidatorNow(uint validatorId) external allow("ValidatorService") returns (uint) {
        return calculateDelegatedToValidator(validatorId, getCurrentMonth());
    }

    function calculateEffectiveDelegatedByHolderToValidator(address holder, uint validatorId, uint month) external
        allow("Distributor") returns (uint)
    {
        return calculateValue(_effectiveDelegatedByHolderToValidator[holder][validatorId], month);
    }

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
        allow("DelegationService")
        returns (uint delegationId)
    {
        delegationId = delegations.length;
        delegations.push(Delegation(
            holder,
            validatorId,
            amount,
            delegationPeriod,
            now,
            0,
            0,
            info
        ));
        // _activeByHolder[holder].push(delegationId);
        // _activeByValidator[validatorId].push(delegationId);
        addToLockedInPendingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);
    }

    function calculateLockedAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function calculateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return _calculateLockedAmount(wallet);
    }

    function cancelPendingDelegation(uint delegationId) external checkDelegationExists(delegationId) {
        require(msg.sender == delegations[delegationId].holder, "Only token holders can cancel delegation request");
        require(getState(delegationId) == State.PROPOSED, "Token holders able to cancel only PROPOSED delegations");

        delegations[delegationId].finished = getCurrentMonth();
        substractFromLockedInPerdingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);
    }

    /// @notice Allows validator to accept tokens delegated at `delegationId`
    function acceptPendingDelegation(uint delegationId) external checkDelegationExists(delegationId) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(
            validatorService.checkValidatorAddressToId(msg.sender, delegations[delegationId].validatorId),
            "No permissions to accept request");
        require(getState(delegationId) == State.PROPOSED, "Can't set state to accepted");

        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));
        TokenLaunchLocker tokenLaunchLocker = TokenLaunchLocker(contractManager.getContract("TokenLaunchLocker"));

        uint currentMonth = timeHelpers.timestampToMonth(now);
        delegations[delegationId].started = currentMonth + 1;
        _delegationExtras[delegationId].lastSlashingMonthBeforeDelegation = _slashesOfValidator[delegations[delegationId].validatorId].lastMonth;

        addToDelegatedToValidator(
            delegations[delegationId].validatorId,
            delegations[delegationId].amount,
            currentMonth + 1);
        addToDelegatedByHolder(
            delegations[delegationId].holder,
            delegations[delegationId].amount,
            currentMonth + 1);
        updateFirstDelegationMonth(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            currentMonth + 1);
        uint effectiveAmount = delegations[delegationId].amount * delegationPeriodManager.stakeMultipliers(
            delegations[delegationId].delegationPeriod);
        addToEffectiveDelegatedToValidator(
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth + 1);
        addToEffectiveDelegatedByHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth + 1);

        tokenLaunchLocker.handleDelegationAdd(
            delegations[delegationId].holder,
            delegationId,
            delegations[delegationId].amount,
            delegations[delegationId].started);
    }

    function requestUndelegation(uint delegationId) external allow("DelegationService") {
        require(getState(delegationId) == State.DELEGATED, "Can't request undelegation");

        TokenLaunchLocker tokenLaunchLocker = TokenLaunchLocker(contractManager.getContract("TokenLaunchLocker"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));

        delegations[delegationId].finished = calculateDelegationEndMonth(delegationId);
        uint amountAfterSlashing = calculateDelegationAmountAfterSlashing(delegationId);

        removeFromDelegatedToValidator(
            delegations[delegationId].validatorId,
            amountAfterSlashing,
            delegations[delegationId].finished);
        removeFromDelegatedByHolder(
            delegations[delegationId].holder,
            delegations[delegationId].amount,
            delegations[delegationId].finished);
        uint effectiveAmount = delegations[delegationId].amount * delegationPeriodManager.stakeMultipliers(
            delegations[delegationId].delegationPeriod);
        removeFromEffectiveDelegatedToValidator(
            delegations[delegationId].validatorId,
            effectiveAmount,
            delegations[delegationId].finished);
        removeFromEffectiveDelegatedByHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            effectiveAmount,
            delegations[delegationId].finished);

        tokenLaunchLocker.handleDelegationRemoving(
            delegations[delegationId].holder,
            delegationId,
            delegations[delegationId].finished);
    }

    function confiscate(uint validatorId, uint amount) external {
        uint currentMonth = getCurrentMonth();
        Fraction memory coefficient = reduce(_delegatedToValidator[validatorId], amount, currentMonth);
        putToSlashingLog(_slashesOfValidator[validatorId], coefficient, currentMonth);
    }

    function getFirstDelegationMonth(address holder, uint validatorId) external view returns(uint) {
        return _firstDelegationMonth[holder][validatorId];
    }

    function calculateEffectiveDelegatedToValidator(uint validatorId, uint month)
        external allow("Distributor") returns (uint)
    {
        return calculateValue(_effectiveDelegatedToValidator[validatorId], month);
        // TODO: subtract slashed
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
    }

    function calculateDelegatedToValidator(uint validatorId, uint month) public allow("ValidatorService") returns (uint) {
        return calculateValue(_delegatedToValidator[validatorId], month);
        // TODO: subtract slashed
    }

    function getState(uint delegationId) public view returns (State state) {
        if (delegations[delegationId].started == 0) {
            if (delegations[delegationId].finished == 0) {
                TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
                if (now < timeHelpers.getNextMonthStartFromDate(delegations[delegationId].created)) {
                    return State.PROPOSED;
                } else {
                    return State.REJECTED;
                }
            } else {
                return State.CANCELED;
            }
        } else {
            TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
            if (now < timeHelpers.monthToTimestamp(delegations[delegationId].started)) {
                return State.ACCEPTED;
            } else {
                if (delegations[delegationId].finished == 0) {
                    return State.DELEGATED;
                } else {
                    if (now < timeHelpers.monthToTimestamp(delegations[delegationId].finished)) {
                        return State.UNDELEGATION_REQUESTED;
                    } else {
                        return State.COMPLETED;
                    }
                }
            }
        }
    }

    function getLockedInPendingDelegations(address holder) public view returns (uint) {
        uint currentMonth = getCurrentMonth();
        if (_lastWriteTolockedInPendingRequests[holder] < currentMonth) {
            return 0;
        } else {
            return _lockedInPendingRequests[holder];
        }
    }

    // private

    function isTerminated(State state) internal pure returns (bool) {
        return state == State.COMPLETED || state == State.REJECTED;
    }

    function isLocked(State state) internal pure returns (bool) {
        return !isTerminated(state);
    }

    function isDelegated(State state) internal pure returns (bool) {
        return state == State.DELEGATED || state == State.UNDELEGATION_REQUESTED;
    }

    function calculateDelegationEndMonth(uint delegationId) internal view returns (uint) {
        uint currentMonth = getCurrentMonth();
        uint started = delegations[delegationId].started;

        if (currentMonth < started) {
            return started + delegations[delegationId].delegationPeriod;
        } else {
            uint completedPeriods = (currentMonth - started) / delegations[delegationId].delegationPeriod;
            return started + (completedPeriods + 1) * delegations[delegationId].delegationPeriod;
        }
    }

    function addToDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        add(_delegatedToValidator[validatorId], amount, month);
    }

    function addToEffectiveDelegatedToValidator(uint validatorId, uint effectiveAmount, uint month) internal {
        add(_effectiveDelegatedToValidator[validatorId], effectiveAmount, month);
    }

    function addToDelegatedByHolder(address holder, uint amount, uint month) internal {
        add(_delegatedByHolder[holder], amount, month);
    }

    function removeFromDelegatedByHolder(address holder, uint amount, uint month) internal {
        subtract(_delegatedByHolder[holder], amount, month);
    }

    function addToEffectiveDelegatedByHolderToValidator(
        address holder,
        uint validatorId,
        uint effectiveAmount,
        uint month)
        internal
    {
        add(_effectiveDelegatedByHolderToValidator[holder][validatorId], effectiveAmount, month);
    }

    function removeFromEffectiveDelegatedByHolderToValidator(
        address holder,
        uint validatorId,
        uint effectiveAmount,
        uint month)
        internal
    {
        subtract(_effectiveDelegatedByHolderToValidator[holder][validatorId], effectiveAmount, month);
    }

    function calculateDelegatedByHolder(address holder) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        return calculateValue(_delegatedByHolder[holder], currentMonth);
    }

    function addToLockedInPendingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        if (_lastWriteTolockedInPendingRequests[holder] < currentMonth) {
            _lockedInPendingRequests[holder] = 0;
        }
        _lockedInPendingRequests[holder] += amount;
        _lastWriteTolockedInPendingRequests[holder] = currentMonth;
    }

    function substractFromLockedInPerdingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        require(_lastWriteTolockedInPendingRequests[holder] == currentMonth, "There are no delegation requests this month");
        require(_lockedInPendingRequests[holder] >= amount, "Unlocking amount is too big");
        _lockedInPendingRequests[holder] -= amount;
    }

    function getCurrentMonth() internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        return timeHelpers.timestampToMonth(now);
    }

    function _calculateLockedAmount(address wallet) internal returns (uint) {
        return calculateDelegatedByHolder(wallet) + getLockedInPendingDelegations(wallet);
    }

    function min(uint a, uint b) internal returns (uint) {
        if (a < b) {
            return a;
        } else {
            return b;
        }
    }

    function updateFirstDelegationMonth(address holder, uint validatorId, uint month) internal {
        if (_firstDelegationMonth[holder][validatorId] == 0) {
            _firstDelegationMonth[holder][validatorId] = month;
        }
    }

    function removeFromDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        subtract(_delegatedToValidator[validatorId], amount, month);
    }

    function removeFromEffectiveDelegatedToValidator(uint validatorId, uint effectiveAmount, uint month) internal {
        subtract(_effectiveDelegatedToValidator[validatorId], effectiveAmount, month);
    }

    function init(PartialDifferences storage sequence) internal {
        sequence.firstUnprocessedMonth = 0;
    }

    function calculateDelegationAmountAfterSlashing(uint delegationId) internal returns (uint) {
        uint startMonth = _delegationExtras[delegationId].lastSlashingMonthBeforeDelegation;
        uint validatorId = delegations[delegationId].validatorId;
        uint amount = delegations[delegationId].amount;
        if (startMonth == 0) {
            startMonth = _slashesOfValidator[validatorId].firstMonth;
            if (startMonth == 0) {
                return amount;
            }
        }
        for (uint i = startMonth; i > 0 && i < delegations[delegationId].finished; i = _slashesOfValidator[validatorId].slashes[i].nextMonth) {
            if (i >= delegations[delegationId].started) {
                amount = amount * _slashesOfValidator[validatorId].slashes[i].reducingCoefficient.numerator / _slashesOfValidator[validatorId].slashes[i].reducingCoefficient.denominator;
            }
        }
        return amount;
    }

    function add(PartialDifferences storage sequence, uint diff, uint month) internal {
        require(sequence.firstUnprocessedMonth <= month, "Can't add to the past");
        if (sequence.firstUnprocessedMonth == 0) {
            sequence.firstUnprocessedMonth = month;
        }
        sequence.addDiff[month] += diff;
    }

    function subtract(PartialDifferences storage sequence, uint diff, uint month) internal {
        require(sequence.firstUnprocessedMonth <= month, "Can't subtract from the past");
        if (sequence.firstUnprocessedMonth == 0) {
            sequence.firstUnprocessedMonth = month;
        }
        sequence.subtractDiff[month] += diff;
    }

    function calculateValue(PartialDifferences storage sequence, uint month) internal returns (uint) {
        if (sequence.firstUnprocessedMonth == 0) {
            return 0;
        }

        if (sequence.firstUnprocessedMonth <= month) {
            for (uint i = sequence.firstUnprocessedMonth; i <= month; ++i) {
                sequence.value[i] = sequence.value[i - 1] + sequence.addDiff[i] - sequence.subtractDiff[i];
                delete sequence.addDiff[i];
                delete sequence.subtractDiff[i];
            }
            sequence.firstUnprocessedMonth = month + 1;
        }

        return sequence.value[month];
    }

    function getValue(PartialDifferences storage sequence, uint month) internal view returns (uint) {
        if (sequence.firstUnprocessedMonth == 0) {
            return 0;
        }
        if (sequence.firstUnprocessedMonth <= month) {
            uint value = sequence.value[sequence.firstUnprocessedMonth - 1];
            for (uint i = sequence.firstUnprocessedMonth; i <= month; ++i) {
                value += sequence.addDiff[i] - sequence.subtractDiff[i];
            }
            return value;
        } else {
            return sequence.value[month];
        }
    }

    function calculateValueBeforeMonthAndGetAtMonth(PartialDifferences storage sequence, uint month) internal returns (uint) {
        calculateValue(sequence, month - 1);
        return getValue(sequence, month);
    }

    function add(PartialDifferencesValue storage sequence, uint diff, uint month) internal {
        require(sequence.firstUnprocessedMonth <= month, "Can't add to the past");
        if (sequence.firstUnprocessedMonth == 0) {
            sequence.firstUnprocessedMonth = month;
            sequence.lastChangedMonth = month;
        }
        if (month > sequence.lastChangedMonth) {
            sequence.lastChangedMonth = month;
        }

        sequence.addDiff[month] += diff;
    }

    function subtract(PartialDifferencesValue storage sequence, uint diff, uint month) internal {
        require(sequence.firstUnprocessedMonth <= month, "Can't subtract from the past");
        if (sequence.firstUnprocessedMonth == 0) {
            sequence.firstUnprocessedMonth = month;
            sequence.lastChangedMonth = month;
        }
        if (month > sequence.lastChangedMonth) {
            sequence.lastChangedMonth = month;
        }

        sequence.subtractDiff[month] += diff;
    }

    function calculateValue(PartialDifferencesValue storage sequence, uint month) internal returns (uint) {
        require(month + 1 >= sequence.firstUnprocessedMonth, "Can't calculate value in the past");
        if (sequence.firstUnprocessedMonth == 0) {
            return 0;
        }

        if (sequence.firstUnprocessedMonth <= month) {
            for (uint i = sequence.firstUnprocessedMonth; i <= month; ++i) {
                sequence.value += sequence.addDiff[i] - sequence.subtractDiff[i];
                delete sequence.addDiff[i];
                delete sequence.subtractDiff[i];
            }
            sequence.firstUnprocessedMonth = month + 1;
        }

        return sequence.value;
    }

    function reduce(PartialDifferencesValue storage sequence, uint amount, uint month) internal returns (Fraction memory) {
        require(month + 1 >= sequence.firstUnprocessedMonth, "Can't reduce value in the past");
        if (sequence.firstUnprocessedMonth == 0) {
            return createFraction(0);
        }
        uint value = calculateValue(sequence, month);
        if (value == 0) {
            return createFraction(0);
        }

        uint _amount = amount;
        if (value < amount) {
            _amount = value;
        }

        Fraction memory reducingCoefficient = createFraction(value - _amount, value);
        sequence.value -= _amount;
        for (uint i = month + 1; i <= sequence.lastChangedMonth; ++i) {
            sequence.subtractDiff[i] = sequence.subtractDiff[i] * reducingCoefficient.numerator / reducingCoefficient.denominator;
        }
        return reducingCoefficient;
    }

    function createFraction(uint numerator, uint denominator) internal pure returns (Fraction memory) {
        require(denominator > 0, "Devision by zero");
        Fraction memory fraction = Fraction({numerator: numerator, denominator: denominator});
        reduceFraction(fraction);
        return fraction;
    }

    function createFraction(uint value) internal pure returns (Fraction memory) {
        return createFraction(value, 1);
    }

    function reduceFraction(Fraction memory fraction) internal pure {
        uint _gcd = gcd(fraction.numerator, fraction.denominator);
        fraction.numerator /= _gcd;
        fraction.denominator /= _gcd;
    }

    function multiplyFraction(Fraction memory a, Fraction memory b) internal pure returns (Fraction memory) {
        return createFraction(a.numerator * b.numerator, a.denominator * b.denominator);
    }

    function gcd(uint _a, uint _b) internal pure returns (uint) {
        uint a = _a;
        uint b = _b;
        if (b > a) {
            (a, b) = swap(a, b);
        }
        while (b > 0) {
            a %= b;
            (a, b) = swap (a, b);
        }
        return a;
    }

    function swap(uint a, uint b) internal pure returns (uint, uint) {
        return (b, a);
    }

    function putToSlashingLog(SlashingLog storage log, Fraction memory coefficient, uint month) internal {
        if (log.firstMonth == 0) {
            log.firstMonth = month;
            log.lastMonth = month;
            log.slashes[month].reducingCoefficient = coefficient;
            log.slashes[month].nextMonth = 0;
        } else {
            require(log.lastMonth <= month, "Can't put slashing event in the past");
            if (log.lastMonth == month) {
                log.slashes[month].reducingCoefficient = multiplyFraction(log.slashes[month].reducingCoefficient, coefficient);
            } else {
                log.slashes[month].reducingCoefficient = coefficient;
                log.slashes[month].nextMonth = 0;
                log.slashes[log.lastMonth].nextMonth = month;
                log.lastMonth = month;
            }
        }
    }
}
