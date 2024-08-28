// SPDX-License-Identifier: AGPL-3.0-only

/*
    Distributor.sol - SKALE Manager
    Copyright (C) 2019-Present SKALE Labs
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

pragma solidity 0.8.17;

import {IERC1820Registry} from "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import {IERC777Recipient} from "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IDistributor} from "@skalenetwork/skale-manager-interfaces/delegation/IDistributor.sol";
import {
    IValidatorService
} from "@skalenetwork/skale-manager-interfaces/delegation/IValidatorService.sol";
import {
    IDelegationController
} from "@skalenetwork/skale-manager-interfaces/delegation/IDelegationController.sol";
import {ITimeHelpers} from "@skalenetwork/skale-manager-interfaces/delegation/ITimeHelpers.sol";

import {Permissions} from "../Permissions.sol";
import {ConstantsHolder} from "../ConstantsHolder.sol";
import {MathUtils} from "../utils/MathUtils.sol";

/**
 * @title Distributor
 * @dev This contract handles all distribution functions of bounty and fee
 * payments.
 */
contract Distributor is Permissions, IERC777Recipient, IDistributor {
    using MathUtils for uint;

    IERC1820Registry private _erc1820;

    // validatorId =>        month => token
    mapping(uint256 => mapping(uint256 => uint256)) private _bountyPaid;
    // validatorId =>        month => token
    mapping(uint256 => mapping(uint256 => uint256)) private _feePaid;
    //        holder =>   validatorId => month
    mapping(address => mapping(uint256 => uint256))
        private _firstUnwithdrawnMonth;
    // validatorId => month
    mapping(uint256 => uint256) private _firstUnwithdrawnMonthForValidator;

    function initialize(address contractsAddress) public override initializer {
        Permissions.initialize(contractsAddress);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(
            address(this),
            keccak256("ERC777TokensRecipient"),
            address(this)
        );
    }

    /**
     * @dev Return and update the amount of earned bounty from a validator.
     */
    function getAndUpdateEarnedBountyAmount(
        uint256 validatorId
    ) external override returns (uint256 earned, uint256 endMonth) {
        return getAndUpdateEarnedBountyAmountOf(msg.sender, validatorId);
    }

    /**
     * @dev Allows msg.sender to withdraw earned bounty. Bounties are locked
     * until launchTimestamp and BOUNTY_LOCKUP_MONTHS have both passed.
     *
     * Emits a {WithdrawBounty} event.
     *
     * Requirements:
     *
     * - Bounty must be unlocked.
     */
    function withdrawBounty(uint256 validatorId, address to) external override {
        ITimeHelpers timeHelpers = ITimeHelpers(
            contractManager.getContract("TimeHelpers")
        );
        ConstantsHolder constantsHolder = ConstantsHolder(
            contractManager.getContract("ConstantsHolder")
        );

        require(
            block.timestamp >=
                timeHelpers.addMonths(
                    constantsHolder.launchTimestamp(),
                    constantsHolder.BOUNTY_LOCKUP_MONTHS()
                ),
            "Bounty is locked"
        );

        uint256 bounty;
        uint256 endMonth;
        (bounty, endMonth) = getAndUpdateEarnedBountyAmountOf(
            msg.sender,
            validatorId
        );

        _firstUnwithdrawnMonth[msg.sender][validatorId] = endMonth;

        IERC20 skaleToken = IERC20(contractManager.getContract("SkaleToken"));
        require(skaleToken.transfer(to, bounty), "Failed to transfer tokens");

        emit WithdrawBounty(msg.sender, validatorId, to, bounty);
    }

    /**
     * @dev Allows `msg.sender` to withdraw earned validator fees. Fees are
     * locked until launchTimestamp and BOUNTY_LOCKUP_MONTHS both have passed.
     *
     * Emits a {WithdrawFee} event.
     *
     * Requirements:
     *
     * - Fee must be unlocked.
     */
    function withdrawFee(address to) external override {
        IValidatorService validatorService = IValidatorService(
            contractManager.getContract("ValidatorService")
        );
        IERC20 skaleToken = IERC20(contractManager.getContract("SkaleToken"));
        ITimeHelpers timeHelpers = ITimeHelpers(
            contractManager.getContract("TimeHelpers")
        );
        ConstantsHolder constantsHolder = ConstantsHolder(
            contractManager.getContract("ConstantsHolder")
        );

        require(
            block.timestamp >=
                timeHelpers.addMonths(
                    constantsHolder.launchTimestamp(),
                    constantsHolder.BOUNTY_LOCKUP_MONTHS()
                ),
            "Fee is locked"
        );
        // check Validator Exist inside getValidatorId
        uint256 validatorId = validatorService.getValidatorId(msg.sender);

        uint256 fee;
        uint256 endMonth;
        (fee, endMonth) = getEarnedFeeAmountOf(validatorId);

        _firstUnwithdrawnMonthForValidator[validatorId] = endMonth;

        require(skaleToken.transfer(to, fee), "Failed to transfer tokens");

        emit WithdrawFee(validatorId, to, fee);
    }

    function tokensReceived(
        address,
        address,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata
    ) external override allow("SkaleToken") {
        require(to == address(this), "Receiver is incorrect");
        require(userData.length == 32, "Data length is incorrect");
        uint256 validatorId = abi.decode(userData, (uint256));
        _distributeBounty(amount, validatorId);
    }

    /**
     * @dev Return the amount of earned validator fees of `msg.sender`.
     */
    function getEarnedFeeAmount()
        external
        view
        override
        returns (uint256 earned, uint256 endMonth)
    {
        IValidatorService validatorService = IValidatorService(
            contractManager.getContract("ValidatorService")
        );
        return
            getEarnedFeeAmountOf(validatorService.getValidatorId(msg.sender));
    }

    /**
     * @dev Return and update the amount of earned bounties.
     */
    function getAndUpdateEarnedBountyAmountOf(
        address wallet,
        uint256 validatorId
    ) public override returns (uint256 earned, uint256 endMonth) {
        IDelegationController delegationController = IDelegationController(
            contractManager.getContract("DelegationController")
        );
        ITimeHelpers timeHelpers = ITimeHelpers(
            contractManager.getContract("TimeHelpers")
        );

        uint256 currentMonth = timeHelpers.getCurrentMonth();

        uint256 startMonth = _firstUnwithdrawnMonth[wallet][validatorId];
        if (startMonth == 0) {
            startMonth = delegationController.getFirstDelegationMonth(
                wallet,
                validatorId
            );
            if (startMonth == 0) {
                return (0, 0);
            }
        }

        earned = 0;
        endMonth = currentMonth;
        if (endMonth > startMonth + 120) {
            endMonth = startMonth + 120;
        }
        for (uint256 i = startMonth; i < endMonth; ++i) {
            uint256 effectiveDelegatedToValidator = delegationController
                .getAndUpdateEffectiveDelegatedToValidator(validatorId, i);
            if (effectiveDelegatedToValidator.muchGreater(0)) {
                earned =
                    earned +
                    (_bountyPaid[validatorId][i] *
                        delegationController
                            .getAndUpdateEffectiveDelegatedByHolderToValidator(
                                wallet,
                                validatorId,
                                i
                            )) /
                    effectiveDelegatedToValidator;
            }
        }
    }

    /**
     * @dev Return the amount of earned fees by validator ID.
     */
    function getEarnedFeeAmountOf(
        uint256 validatorId
    ) public view override returns (uint256 earned, uint256 endMonth) {
        ITimeHelpers timeHelpers = ITimeHelpers(
            contractManager.getContract("TimeHelpers")
        );

        uint256 currentMonth = timeHelpers.getCurrentMonth();

        uint256 startMonth = _firstUnwithdrawnMonthForValidator[validatorId];
        if (startMonth == 0) {
            return (0, 0);
        }

        earned = 0;
        endMonth = currentMonth;
        if (endMonth > startMonth + 12) {
            endMonth = startMonth + 12;
        }
        for (uint256 i = startMonth; i < endMonth; ++i) {
            earned = earned + _feePaid[validatorId][i];
        }
    }

    // private

    /**
     * @dev Distributes bounties to delegators.
     *
     * Emits a {BountyWasPaid} event.
     */
    function _distributeBounty(uint256 amount, uint256 validatorId) private {
        ITimeHelpers timeHelpers = ITimeHelpers(
            contractManager.getContract("TimeHelpers")
        );
        IValidatorService validatorService = IValidatorService(
            contractManager.getContract("ValidatorService")
        );

        uint256 currentMonth = timeHelpers.getCurrentMonth();
        uint256 feeRate = validatorService.getValidator(validatorId).feeRate;

        uint256 fee = (amount * feeRate) / 1000;
        uint256 bounty = amount - fee;
        _bountyPaid[validatorId][currentMonth] =
            _bountyPaid[validatorId][currentMonth] +
            bounty;
        _feePaid[validatorId][currentMonth] =
            _feePaid[validatorId][currentMonth] +
            fee;

        if (_firstUnwithdrawnMonthForValidator[validatorId] == 0) {
            _firstUnwithdrawnMonthForValidator[validatorId] = currentMonth;
        }

        emit BountyWasPaid(validatorId, amount);
    }
}
