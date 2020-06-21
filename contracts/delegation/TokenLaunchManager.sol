// SPDX-License-Identifier: AGPL-3.0-only

/*
    TokenLaunchManager.sol - SKALE Manager
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

pragma solidity 0.6.8;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";

import "../Permissions.sol";
import "./TokenLaunchLocker.sol";

/**
 * @title Token Launch Manager
 * @dev This contract manages functions for the Token Launch event.
 *
 * The seller is an entity who distributes tokens through a Launch process.
 */
contract TokenLaunchManager is Permissions, IERC777Recipient {

    /**
     * @dev Emitted when a holder is approved for an amount.
     */
    event Approved(
        address holder,
        uint amount
    );

    /**
     * @dev Emitted when a holder retrieves amount.
     */
    event TokensRetrieved(
        address holder,
        uint amount
    );

    /**
     * @dev Emitted when a `seller` is registered.
     */
    event SellerWasRegistered(
        address seller
    );

    IERC1820Registry private _erc1820;

    address public seller;

    mapping (address => uint) public approved;
    uint private _totalApproved;

    modifier onlySeller() {
        require(_isOwner() || _msgSender() == seller, "Not authorized");
        _;
    }

    /**
     * @dev Allocates values for `walletAddresses`
     *
     * Requirements:
     *
     * - Input arrays must be equal in size.
     * - Total approved must be less than or equal to the seller balance.
     *
     * Emits an Approved event.
     */
    function approveBatchOfTransfers(address[] calldata walletAddress, uint[] calldata value) external onlySeller {
        require(walletAddress.length == value.length, "Wrong input arrays length");
        for (uint i = 0; i < walletAddress.length; ++i) {
            approveTransfer(walletAddress[i], value[i]);
        }
        require(_totalApproved <= _getBalance(), "Balance is too low");
    }

    /**
     * @dev Allows the seller to update a purchaser's address in case of an error.
     *
     * Requirements:
     *
     * - Updated address must not already be in use.
     *
     * Emits an Approved event.
     */
    function changeApprovalAddress(address oldAddress, address newAddress) external onlySeller {
        require(approved[newAddress] == 0, "New address is already used");
        uint oldValue = approved[oldAddress];
        if (oldValue > 0) {
            _setApprovedAmount(oldAddress, 0);
            approveTransfer(newAddress, oldValue);
        }
    }

    /**
     * @dev Allows the seller to update a purchaser's amount in case of an error.
     */
    function changeApprovalValue(address wallet, uint newValue) external onlySeller {
        _setApprovedAmount(wallet, newValue);
    }

    /**
     * @dev Transfers the entire value to the sender's address. Transferred tokens
     * are locked for Proof-of-Use.
     *
     * Requirements:
     *
     * - Token transfer must be approved.
     */
    function retrieve() external {
        require(approved[_msgSender()] > 0, "Transfer is not approved");
        uint value = approved[_msgSender()];
        _setApprovedAmount(_msgSender(), 0);
        require(
            IERC20(_contractManager.getContract("SkaleToken")).transfer(_msgSender(), value),
            "Error in transfer call to SkaleToken");
        TokenLaunchLocker(_contractManager.getContract("TokenLaunchLocker")).lock(_msgSender(), value);
        emit TokensRetrieved(_msgSender(), value);
    }

    /**
     * @dev Allows the Owner to register a Seller.
     *
     * Emits a SellerWasRegistered event.
     */
    function registerSeller(address _seller) external onlyOwner {
        seller = _seller;
        emit SellerWasRegistered(_seller);
    }

    /**
     * @dev A required callback for ERC777.
     */
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

    function initialize(address contractManager) public override initializer {
        Permissions.initialize(contractManager);
        _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
        _erc1820.setInterfaceImplementer(address(this), keccak256("ERC777TokensRecipient"), address(this));
    }

    function approveTransfer(address walletAddress, uint value) public onlySeller {
        _setApprovedAmount(walletAddress, approved[walletAddress].add(value));
        emit Approved(walletAddress, value);
    }

    // private

    function _getBalance() private view returns(uint balance) {
        return IERC20(_contractManager.getContract("SkaleToken")).balanceOf(address(this));
    }

    function _setApprovedAmount(address wallet, uint value) private {
        uint oldValue = approved[wallet];
        if (oldValue != value) {
            approved[wallet] = value;
            if (value > oldValue) {
                _totalApproved = _totalApproved.add(value - oldValue);
            } else {
                _totalApproved = _totalApproved.sub(oldValue - value);
            }
        }
    }
}