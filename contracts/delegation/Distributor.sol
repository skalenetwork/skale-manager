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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";

import "../Permissions.sol";
import "../SkaleToken.sol";
import "../ConstantsHolder.sol";
import "./ValidatorService.sol";
import "./DelegationController.sol";
import "./DelegationPeriodManager.sol";
import "./TimeHelpers.sol";


contract Distributor is Permissions, IERC777Recipient {
    IERC1820Registry private _erc1820;

    // validatorId =>        month => token
    mapping (uint => mapping (uint => uint)) private _bountyPaid;
    // validatorId =>        month => token
    mapping (uint => mapping (uint => uint)) private _feePaid;
    //        holder =>   validatorId => month
    mapping (address => mapping (uint => uint)) private _firstUnwithdrawnMonth;
    // validatorId => month
    mapping (uint => uint) private _firstUnwithdrawnMonthForValidator;

    function calculateEarnedBountyAmount(uint validatorId) external returns (uint earned, uint endMonth) {
        return calculateEarnedBountyAmountOf(msg.sender, validatorId);
    }

    function calculateEarnedFeeAmount() external returns (uint earned, uint endMonth) {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        return calculateEarnedFeeAmountOf(validatorService.getValidatorId(msg.sender));
    }

    function withdrawBounty(uint validatorId, address to) external {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));

        require(now >= timeHelpers.addMonths(constantsHolder.launchTimestamp(), 3), "Bounty is locked");

        uint bounty;
        uint endMonth;
        (bounty, endMonth) = calculateEarnedBountyAmountOf(msg.sender, validatorId);

        _firstUnwithdrawnMonth[msg.sender][validatorId] = endMonth;

        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        require(skaleToken.transfer(to, bounty), "Failed to transfer tokens");
    }

    function withdrawFee(address to) external {
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));
        SkaleToken skaleToken = SkaleToken(contractManager.getContract("SkaleToken"));
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));

        require(now >= timeHelpers.addMonths(constantsHolder.launchTimestamp(), 3), "Bounty is locked");

        uint fee;
        uint endMonth;
        uint validatorId = validatorService.getValidatorId(msg.sender);
        (fee, endMonth) = calculateEarnedFeeAmountOf(validatorId);

        _firstUnwithdrawnMonthForValidator[validatorId] = endMonth;

        require(skaleToken.transfer(to, fee), "Failed to transfer tokens");
    }

    function tokensReceived(
        address,
        address,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata
    )
        external
        allow("SkaleToken")
    {
        require(to == address(this), "Receiver is incorrect");
        require(userData.length == 32, "Data length is incorrect");
        uint validatorId = abi.decode(userData, (uint));
        distributeBounty(amount, validatorId);
    }

    function initialize(address _contractsAddress) public initializer {
        Permissions.initialize(_contractsAddress);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function calculateEarnedBountyAmountOf(address wallet, uint validatorId) public returns (uint earned, uint endMonth) {
        DelegationController delegationController = DelegationController(contractManager.getContract("DelegationController"));
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

        uint currentMonth = timeHelpers.getCurrentMonth();

        uint startMonth = _firstUnwithdrawnMonth[wallet][validatorId];
        if (startMonth == 0) {
            startMonth = delegationController.getFirstDelegationMonth(wallet, validatorId);
            if (startMonth == 0) {
                return (0, 0);
            }
        }

        earned = 0;
        endMonth = currentMonth;
        if (endMonth > startMonth + 12) {
            endMonth = startMonth + 12;
        }
        for (uint i = startMonth; i < endMonth; ++i) {
            uint effectiveDelegatedToValidator = delegationController.calculateEffectiveDelegatedToValidator(validatorId, i);
            if (effectiveDelegatedToValidator > 0) {
                earned += _bountyPaid[validatorId][i] *
                    delegationController.calculateEffectiveDelegatedByHolderToValidator(wallet, validatorId, i) /
                    effectiveDelegatedToValidator;
            }
        }
    }

    function calculateEarnedFeeAmountOf(uint validatorId) public returns (uint earned, uint endMonth) {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));

        uint currentMonth = timeHelpers.getCurrentMonth();

        uint startMonth = _firstUnwithdrawnMonthForValidator[validatorId];
        if (startMonth == 0) {
            return (0, 0);
        }

        earned = 0;
        endMonth = currentMonth;
        if (endMonth > startMonth + 12) {
            endMonth = startMonth + 12;
        }
        for (uint i = startMonth; i < endMonth; ++i) {
            earned += _feePaid[validatorId][i];
        }
    }

    // private

    function distributeBounty(uint amount, uint validatorId) internal {
        TimeHelpers timeHelpers = TimeHelpers(contractManager.getContract("TimeHelpers"));
        ValidatorService validatorService = ValidatorService(contractManager.getContract("ValidatorService"));

        uint currentMonth = timeHelpers.getCurrentMonth();
        uint feeRate = validatorService.getValidator(validatorId).feeRate;

        uint fee = amount * feeRate / 1000;
        uint bounty = amount - fee;
        _bountyPaid[validatorId][currentMonth] += bounty;
        _feePaid[validatorId][currentMonth] += fee;

        if (_firstUnwithdrawnMonthForValidator[validatorId] == 0) {
            _firstUnwithdrawnMonthForValidator[validatorId] = currentMonth;
        }
    }
}