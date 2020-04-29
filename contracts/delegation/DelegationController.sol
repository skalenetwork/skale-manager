/*
    DelegationController.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky
    @author Dmytro Stebaiev

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

import "@openzeppelin/contracts/math/SafeMath.sol";

import "../Permissions.sol";
import "../SkaleToken.sol";
import "../utils/MathUtils.sol";
import "../utils/FractionUtils.sol";

import "./DelegationPeriodManager.sol";
import "./Punisher.sol";
import "./TokenLaunchLocker.sol";
import "./TokenState.sol";
import "./ValidatorService.sol";
import "./PartialDifferences.sol";


contract DelegationController is Permissions, ILocker {
    using MathUtils for uint;
    using PartialDifferences for PartialDifferences.Sequence;
    using PartialDifferences for PartialDifferences.Value;
    using FractionUtils for FractionUtils.Fraction;

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
        uint started; // month when a delegation becomes active
        uint finished; // first month after a delegation ends
        string info;
    }

    struct SlashingLogEvent {
        FractionUtils.Fraction reducingCoefficient;
        uint nextMonth;
    }

    struct SlashingLog {
        //      month => slashing event
        mapping (uint => SlashingLogEvent) slashes;
        uint firstMonth;
        uint lastMonth;
    }

    struct DelegationExtras {
        uint lastSlashingMonthBeforeDelegation;
    }

    struct SlashingEvent {
        FractionUtils.Fraction reducingCoefficient;
        uint validatorId;
        uint month;
    }

    struct SlashingSignal {
        address holder;
        uint penalty;
    }

    struct LockedInPending {
        uint amount;
        uint month;
    }

    struct FirstDelegationMonth {
        // month
        uint value;
        //validatorId => month
        mapping (uint => uint) byValidator;
    }

    event DelegationProposed(
        uint delegationId
    );

    event DelegationAccepted(
        uint delegationId
    );

    event DelegationRequestCanceledByUser(
        uint delegationId
    );

    event UndelegationRequested(
        uint delegationId
    );

    /// @notice delegations will never be deleted to index in this array may be used like delegation id
    Delegation[] public delegations;

    // validatorId => delegationId[]
    mapping (uint => uint[]) public delegationsByValidator;

    //        holder => delegationId[]
    mapping (address => uint[]) public delegationsByHolder;

    // delegationId => extras
    mapping(uint => DelegationExtras) private _delegationExtras;

    // validatorId => sequence
    mapping (uint => PartialDifferences.Value) private _delegatedToValidator;
    // validatorId => sequence
    mapping (uint => PartialDifferences.Sequence) private _effectiveDelegatedToValidator;

    // validatorId => slashing log
    mapping (uint => SlashingLog) private _slashesOfValidator;

    //        holder => sequence
    mapping (address => PartialDifferences.Value) private _delegatedByHolder;
    //        holder =>   validatorId => sequence
    mapping (address => mapping (uint => PartialDifferences.Value)) private _delegatedByHolderToValidator;
    //        holder =>   validatorId => sequence
    mapping (address => mapping (uint => PartialDifferences.Sequence)) private _effectiveDelegatedByHolderToValidator;

    SlashingEvent[] private _slashes;
    //        holder => index in _slashes;
    mapping (address => uint) private _firstUnprocessedSlashByHolder;

    //        holder =>   validatorId => month
    mapping (address => FirstDelegationMonth) private _firstDelegationMonth;

    //        holder => locked in pending
    mapping (address => LockedInPending) private _lockedInPendingDelegations;

    modifier checkDelegationExists(uint delegationId) {
        require(delegationId < delegations.length, "Delegation does not exist");
        _;
    }

    function getDelegation(uint delegationId) external view checkDelegationExists(delegationId) returns (Delegation memory) {
        return delegations[delegationId];
    }

    function getAndUpdateDelegatedToValidatorNow(uint validatorId) external returns (uint) {
        return getAndUpdateDelegatedToValidator(validatorId, getCurrentMonth());
    }

    function getAndUpdateDelegatedAmount(address holder) external returns (uint) {
        return getAndUpdateDelegatedByHolder(holder);
    }

    function getAndUpdateEffectiveDelegatedByHolderToValidator(address holder, uint validatorId, uint month) external
        allow("Distributor") returns (uint effectiveDelegated)
    {
        SlashingSignal[] memory slashingSignals = processAllSlashesWithoutSignals(holder);
        effectiveDelegated = _effectiveDelegatedByHolderToValidator[holder][validatorId].getAndUpdateValueInSequence(month);
        sendSlashingSignals(slashingSignals);
    }

    /// @notice Creates request to delegate `amount` of tokens to `validator` from the begining of the next month
    function delegate(
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
    {

        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        TokenState tokenState = TokenState(contractManager.getContract("TokenState"));

        require(
            validatorService.checkMinimumDelegation(validatorId, amount),
            "Amount does not meet minimum delegation amount");
        require(
            validatorService.trustedValidators(validatorId),
            "Validator is not authorized to accept request");
        require(
            delegationPeriodManager.isDelegationPeriodAllowed(delegationPeriod),
            "This delegation period is not allowed");

        SlashingSignal[] memory slashingSignals = processAllSlashesWithoutSignals(msg.sender);

        uint delegationId = addDelegation(
            msg.sender,
            validatorId,
            amount,
            delegationPeriod,
            info);

        // check that there is enough money
        uint holderBalance = skaleToken.balanceOf(msg.sender);
        uint forbiddenForDelegation = tokenState.getAndUpdateForbiddenForDelegationAmount(msg.sender);
        require(holderBalance >= forbiddenForDelegation, "Delegator does not have enough tokens to delegate");

        emit DelegationProposed(delegationId);

        sendSlashingSignals(slashingSignals);
    }

    function getAndUpdateLockedAmount(address wallet) external returns (uint) {
        return _getAndUpdateLockedAmount(wallet);
    }

    function getAndUpdateForbiddenForDelegationAmount(address wallet) external returns (uint) {
        return _getAndUpdateLockedAmount(wallet);
    }

    function cancelPendingDelegation(uint delegationId) external checkDelegationExists(delegationId) {
        require(msg.sender == delegations[delegationId].holder, "Only token holders can cancel delegation request");
        require(getState(delegationId) == State.PROPOSED, "Token holders able to cancel only PROPOSED delegations");

        delegations[delegationId].finished = getCurrentMonth();
        subtractFromLockedInPerdingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);

        emit DelegationRequestCanceledByUser(delegationId);
    }

    /// @notice Allows validator to accept tokens delegated at `delegationId`
    function acceptPendingDelegation(uint delegationId) external checkDelegationExists(delegationId) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(
            validatorService.checkValidatorAddressToId(msg.sender, delegations[delegationId].validatorId),
            "No permissions to accept request");
        require(getState(delegationId) == State.PROPOSED, "Cannot set state to accepted");

        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));
        TokenLaunchLocker tokenLaunchLocker = TokenLaunchLocker(contractManager.getContract("TokenLaunchLocker"));

        SlashingSignal[] memory slashingSignals = processAllSlashesWithoutSignals(delegations[delegationId].holder);

        uint currentMonth = timeHelpers.getCurrentMonth();
        delegations[delegationId].started = currentMonth.add(1);
        if (_slashesOfValidator[delegations[delegationId].validatorId].lastMonth > 0) {
            _delegationExtras[delegationId].lastSlashingMonthBeforeDelegation = _slashesOfValidator[delegations[delegationId].validatorId].lastMonth;
        }

        addToDelegatedToValidator(
            delegations[delegationId].validatorId,
            delegations[delegationId].amount,
            currentMonth.add(1));
        addToDelegatedByHolder(
            delegations[delegationId].holder,
            delegations[delegationId].amount,
            currentMonth.add(1));
        addToDelegatedByHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            delegations[delegationId].amount,
            currentMonth.add(1));
        updateFirstDelegationMonth(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            currentMonth.add(1));
        uint effectiveAmount = delegations[delegationId].amount.mul(delegationPeriodManager.stakeMultipliers(
            delegations[delegationId].delegationPeriod));
        addToEffectiveDelegatedToValidator(
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth.add(1));
        addToEffectiveDelegatedByHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            effectiveAmount,
            currentMonth.add(1));

        tokenLaunchLocker.handleDelegationAdd(
            delegations[delegationId].holder,
            delegationId,
            delegations[delegationId].amount,
            delegations[delegationId].started);

        sendSlashingSignals(slashingSignals);

        emit DelegationAccepted(delegationId);
    }

    function requestUndelegation(uint delegationId) external checkDelegationExists(delegationId) {
        require(getState(delegationId) == State.DELEGATED, "Cannot request undelegation");

        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        require(
            delegations[delegationId].holder == msg.sender ||
            (validatorService.validatorAddressExists(msg.sender) &&
            delegations[delegationId].validatorId == validatorService.getValidatorId(msg.sender)),
            "Permission denied to request undelegation");

        TokenLaunchLocker tokenLaunchLocker = TokenLaunchLocker(contractManager.getContract("TokenLaunchLocker"));
        DelegationPeriodManager delegationPeriodManager = DelegationPeriodManager(contractManager.getContract("DelegationPeriodManager"));

        processAllSlashes(msg.sender);
        delegations[delegationId].finished = calculateDelegationEndMonth(delegationId);
        uint amountAfterSlashing = calculateDelegationAmountAfterSlashing(delegationId);

        removeFromDelegatedToValidator(
            delegations[delegationId].validatorId,
            amountAfterSlashing,
            delegations[delegationId].finished);
        removeFromDelegatedByHolder(
            delegations[delegationId].holder,
            amountAfterSlashing,
            delegations[delegationId].finished);
        removeFromDelegatedByHolderToValidator(
            delegations[delegationId].holder,
            delegations[delegationId].validatorId,
            amountAfterSlashing,
            delegations[delegationId].finished);
        uint effectiveAmount = amountAfterSlashing.mul(delegationPeriodManager.stakeMultipliers(
            delegations[delegationId].delegationPeriod));
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

        emit UndelegationRequested(delegationId);
    }

    function confiscate(uint validatorId, uint amount) external allow("Punisher") {
        uint currentMonth = getCurrentMonth();
        FractionUtils.Fraction memory coefficient = _delegatedToValidator[validatorId].reduceValue(amount, currentMonth);
        _effectiveDelegatedToValidator[validatorId].reduceSequence(coefficient, currentMonth);
        putToSlashingLog(_slashesOfValidator[validatorId], coefficient, currentMonth);
        _slashes.push(SlashingEvent({reducingCoefficient: coefficient, validatorId: validatorId, month: currentMonth}));
    }

    function getFirstDelegationMonth(address holder, uint validatorId) external view returns(uint) {
        return _firstDelegationMonth[holder].byValidator[validatorId];
    }

    function getAndUpdateEffectiveDelegatedToValidator(uint validatorId, uint month)
        external allow("Distributor") returns (uint)
    {
        return _effectiveDelegatedToValidator[validatorId].getAndUpdateValueInSequence(month);
    }

    function getDelegationsByValidatorLength(uint validatorId) external view returns (uint) {
        return delegationsByValidator[validatorId].length;
    }

    function getDelegationsByHolderLength(address holder) external view returns (uint) {
        return delegationsByHolder[holder].length;
    }

    function initialize(address _contractsAddress) public override initializer {
        Permissions.initialize(_contractsAddress);
    }

    function getAndUpdateDelegatedToValidator(uint validatorId, uint month) public allow("ValidatorService") returns (uint) {
        return _delegatedToValidator[validatorId].getAndUpdateValue(month);
    }

    function getState(uint delegationId) public view checkDelegationExists(delegationId) returns (State state) {
        if (delegations[delegationId].started == 0) {
            if (delegations[delegationId].finished == 0) {
                TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
                if (timeHelpers.getCurrentMonth() == timeHelpers.timestampToMonth(delegations[delegationId].created)) {
                    return State.PROPOSED;
                } else {
                    return State.REJECTED;
                }
            } else {
                return State.CANCELED;
            }
        } else {
            TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
            if (timeHelpers.getCurrentMonth() < delegations[delegationId].started) {
                return State.ACCEPTED;
            } else {
                if (delegations[delegationId].finished == 0) {
                    return State.DELEGATED;
                } else {
                    if (timeHelpers.getCurrentMonth() < delegations[delegationId].finished) {
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
        if (_lockedInPendingDelegations[holder].month < currentMonth) {
            return 0;
        } else {
            return _lockedInPendingDelegations[holder].amount;
        }
    }

    function hasUnprocessedSlashes(address holder) public view returns (bool) {
        return everDelegated(holder) && _firstUnprocessedSlashByHolder[holder] < _slashes.length;
    }

    function processSlashes(address holder, uint limit) public {
        sendSlashingSignals(processSlashesWithoutSignals(holder, limit));
    }

    function processAllSlashes(address holder) public {
        processSlashes(holder, 0);
    }

    // private

    function addDelegation(
        address holder,
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string memory info
    )
        internal
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
        delegationsByValidator[validatorId].push(delegationId);
        delegationsByHolder[holder].push(delegationId);
        addToLockedInPendingDelegations(delegations[delegationId].holder, delegations[delegationId].amount);
    }

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
            return started.add(delegations[delegationId].delegationPeriod);
        } else {
            uint completedPeriods = currentMonth.sub(started).div(delegations[delegationId].delegationPeriod);
            return started.add(completedPeriods.add(1).mul(delegations[delegationId].delegationPeriod));
        }
    }

    function addToDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        _delegatedToValidator[validatorId].addToValue(amount, month);
    }

    function addToEffectiveDelegatedToValidator(uint validatorId, uint effectiveAmount, uint month) internal {
        _effectiveDelegatedToValidator[validatorId].addToSequence(effectiveAmount, month);
    }

    function addToDelegatedByHolder(address holder, uint amount, uint month) internal {
        _delegatedByHolder[holder].addToValue(amount, month);
    }

    function addToDelegatedByHolderToValidator(
        address holder, uint validatorId, uint amount, uint month) internal
    {
        _delegatedByHolderToValidator[holder][validatorId].addToValue(amount, month);
    }

    function removeFromDelegatedByHolder(address holder, uint amount, uint month) internal {
        _delegatedByHolder[holder].subtractFromValue(amount, month);
    }

    function removeFromDelegatedByHolderToValidator(
        address holder, uint validatorId, uint amount, uint month) internal
    {
        _delegatedByHolderToValidator[holder][validatorId].subtractFromValue(amount, month);
    }

    function addToEffectiveDelegatedByHolderToValidator(
        address holder,
        uint validatorId,
        uint effectiveAmount,
        uint month)
        internal
    {
        _effectiveDelegatedByHolderToValidator[holder][validatorId].addToSequence(effectiveAmount, month);
    }

    function removeFromEffectiveDelegatedByHolderToValidator(
        address holder,
        uint validatorId,
        uint effectiveAmount,
        uint month)
        internal
    {
        _effectiveDelegatedByHolderToValidator[holder][validatorId].subtractFromSequence(effectiveAmount, month);
    }

    function getAndUpdateDelegatedByHolder(address holder) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        processAllSlashes(holder);
        return _delegatedByHolder[holder].getAndUpdateValue(currentMonth);
    }

    function getAndUpdateDelegatedByHolderToValidator(address holder, uint validatorId, uint month) internal returns (uint) {
        return _delegatedByHolderToValidator[holder][validatorId].getAndUpdateValue(month);
    }

    function addToLockedInPendingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        if (_lockedInPendingDelegations[holder].month < currentMonth) {
            _lockedInPendingDelegations[holder].amount = amount;
            _lockedInPendingDelegations[holder].month = currentMonth;
        } else {
            assert(_lockedInPendingDelegations[holder].month == currentMonth);
            _lockedInPendingDelegations[holder].amount = _lockedInPendingDelegations[holder].amount.add(amount);
        }
    }

    function subtractFromLockedInPerdingDelegations(address holder, uint amount) internal returns (uint) {
        uint currentMonth = getCurrentMonth();
        require(_lockedInPendingDelegations[holder].month == currentMonth, "There are no delegation requests this month");
        require(_lockedInPendingDelegations[holder].amount >= amount, "Unlocking amount is too big");
        _lockedInPendingDelegations[holder].amount = _lockedInPendingDelegations[holder].amount.sub(amount);
    }

    function getCurrentMonth() internal view returns (uint) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        return timeHelpers.getCurrentMonth();
    }

    function _getAndUpdateLockedAmount(address wallet) internal returns (uint) {
        return getAndUpdateDelegatedByHolder(wallet).add(getLockedInPendingDelegations(wallet));
    }

    function updateFirstDelegationMonth(address holder, uint validatorId, uint month) internal {
        if (_firstDelegationMonth[holder].value == 0) {
            _firstDelegationMonth[holder].value = month;
            _firstUnprocessedSlashByHolder[holder] = _slashes.length;
        }
        if (_firstDelegationMonth[holder].byValidator[validatorId] == 0) {
            _firstDelegationMonth[holder].byValidator[validatorId] = month;
        }
    }

    function everDelegated(address holder) internal view returns (bool) {
        return _firstDelegationMonth[holder].value > 0;
    }

    function removeFromDelegatedToValidator(uint validatorId, uint amount, uint month) internal {
        _delegatedToValidator[validatorId].subtractFromValue(amount, month);
    }

    function removeFromEffectiveDelegatedToValidator(uint validatorId, uint effectiveAmount, uint month) internal {
        _effectiveDelegatedToValidator[validatorId].subtractFromSequence(effectiveAmount, month);
    }

    function calculateDelegationAmountAfterSlashing(uint delegationId) internal view returns (uint) {
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
                amount = amount.mul(_slashesOfValidator[validatorId].slashes[i].reducingCoefficient.numerator).div(_slashesOfValidator[validatorId].slashes[i].reducingCoefficient.denominator);
            }
        }
        return amount;
    }

    function putToSlashingLog(SlashingLog storage log, FractionUtils.Fraction memory coefficient, uint month) internal {
        if (log.firstMonth == 0) {
            log.firstMonth = month;
            log.lastMonth = month;
            log.slashes[month].reducingCoefficient = coefficient;
            log.slashes[month].nextMonth = 0;
        } else {
            require(log.lastMonth <= month, "Cannot put slashing event in the past");
            if (log.lastMonth == month) {
                log.slashes[month].reducingCoefficient = log.slashes[month].reducingCoefficient.multiplyFraction(coefficient);
            } else {
                log.slashes[month].reducingCoefficient = coefficient;
                log.slashes[month].nextMonth = 0;
                log.slashes[log.lastMonth].nextMonth = month;
                log.lastMonth = month;
            }
        }
    }

    function processSlashesWithoutSignals(address holder, uint limit) internal returns (SlashingSignal[] memory slashingSignals) {
        if (hasUnprocessedSlashes(holder)) {
            uint index = _firstUnprocessedSlashByHolder[holder];
            uint end = _slashes.length;
            if (limit > 0 && index.add(limit) < end) {
                end = index.add(limit);
            }
            slashingSignals = new SlashingSignal[](end.sub(index));
            uint begin = index;
            for (; index < end; ++index) {
                uint validatorId = _slashes[index].validatorId;
                uint month = _slashes[index].month;
                uint oldValue = getAndUpdateDelegatedByHolderToValidator(holder, validatorId, month);
                if (oldValue.muchGreater(0)) {
                    _delegatedByHolderToValidator[holder][validatorId].reduceValueByCoefficientAndUpdateSum(
                        _delegatedByHolder[holder],
                        _slashes[index].reducingCoefficient,
                        month);
                    _effectiveDelegatedByHolderToValidator[holder][validatorId].reduceSequence(
                        _slashes[index].reducingCoefficient,
                        month);
                    slashingSignals[index.sub(begin)].holder = holder;
                    slashingSignals[index.sub(begin)].penalty = oldValue.boundedSub(getAndUpdateDelegatedByHolderToValidator(holder, validatorId, month));
                }
            }
            _firstUnprocessedSlashByHolder[holder] = end;
        }
    }

    function processAllSlashesWithoutSignals(address holder) internal returns (SlashingSignal[] memory slashingSignals) {
        return processSlashesWithoutSignals(holder, 0);
    }

    function sendSlashingSignals(SlashingSignal[] memory slashingSignals) internal {
        Punisher punisher = Punisher(contractManager.getContract("Punisher"));
        address previousHolder = address(0);
        uint accumulatedPenalty = 0;
        for (uint i = 0; i < slashingSignals.length; ++i) {
            if (slashingSignals[i].holder != previousHolder) {
                if (accumulatedPenalty > 0) {
                    punisher.handleSlash(previousHolder, accumulatedPenalty);
                }
                previousHolder = slashingSignals[i].holder;
                accumulatedPenalty = slashingSignals[i].penalty;
            } else {
                accumulatedPenalty = accumulatedPenalty.add(slashingSignals[i].penalty);
            }
        }
        if (accumulatedPenalty > 0) {
            punisher.handleSlash(previousHolder, accumulatedPenalty);
        }
    }
}
