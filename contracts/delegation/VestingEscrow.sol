/*
    VestingEscrow.sol - SKALE Manager
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
import "@openzeppelin/contracts/token/ERC777/IERC777Sender.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";
import "../interfaces/delegation/ILocker.sol";
import "./Vesting.sol";
import "./DelegationController.sol";
import "./Distributor.sol";
import "./TokenState.sol";

contract VestingEscrow is IERC777Recipient, IERC777Sender, Permissions {
    address private _holder;

    IERC1820Registry private _erc1820;

    modifier onlyHolder() {
        require(_msgSender() == _holder, "Message sender is not an owner");
        _;
    }

    constructor(address contractManager, address newHolder) public {
        Permissions.initialize(contractManager);
        _holder = newHolder;
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensSender"), address(this));
    }

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

    function tokensToSend(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external override
        allow("SkaleToken")
    {
        require(to == _holder || to == owner(), "Not authorized transfer");
    }

    function retrieve() external onlyHolder {
        Vesting vesting = Vesting(_contractManager.getContract("Vesting"));
        TokenState tokenState = TokenState(_contractManager.getContract("TokenState"));
        require(vesting.isActiveVestingTerm(_holder), "Vesting term is not Active");
        uint availableAmount = vesting.calculateAvailableAmount(_holder);
        uint escrowBalance = IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this));
        uint fullAmount = vesting.getFullAmount(_holder);
        uint forbiddenToSend = tokenState.getAndUpdateLockedAmount(address(this));
        if (availableAmount > fullAmount.sub(escrowBalance)) {
            if (availableAmount.sub(fullAmount.sub(escrowBalance)) > forbiddenToSend)
            require(
                IERC20(_contractManager.getContract("SkaleToken")).transfer(
                    _holder,
                    availableAmount
                        .sub(
                            fullAmount
                                .sub(escrowBalance)
                            )
                        .sub(forbiddenToSend)
                ),
                "Error of token send"
            );
        }
        if (IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this)) == 0) {
            selfdestruct(payable(owner()));
        }
    }

    function delegate(
        uint validatorId,
        uint amount,
        uint delegationPeriod,
        string calldata info
    )
        external
    {
        require(
            IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this)) >= amount,
            "Not enough balance"
        );
        DelegationController delegationController = DelegationController(
            _contractManager.getContract("DelegationController")
        );
        delegationController.delegate(validatorId, amount, delegationPeriod, info);
    }

    function requestUndelegation(uint delegationId) external {
        DelegationController delegationController = DelegationController(
            _contractManager.getContract("DelegationController")
        );
        delegationController.requestUndelegation(delegationId);
    }

    function withdrawBounty(uint validatorId, address to) external {
        Distributor distributor = Distributor(_contractManager.getContract("Distributor"));
        distributor.withdrawBounty(validatorId, to);
    }

    function cancelVesting() external allow("Vesting") {
        TokenState tokenState = TokenState(_contractManager.getContract("TokenState"));
        uint escrowBalance = IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this));
        uint forbiddenToSend = tokenState.getAndUpdateLockedAmount(address(this));
        require(
            IERC20(_contractManager.getContract("SkaleToken")).transfer(
                owner(),
                escrowBalance - forbiddenToSend
            ),
            "Error of token send"
        );
        if (IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this)) == 0) {
            selfdestruct(payable(owner()));
        }
        // should request undelegation of all delegations
    }

}