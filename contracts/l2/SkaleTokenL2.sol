// SPDX-License-Identifier: AGPL-3.0-only

/*
    SkaleTokenL2.sol - SKALE Manager
    Copyright (C) 2025-Present SKALE Labs
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

// cspell:ignore IERC

pragma solidity 0.8.17;

import { SkaleToken } from "../SkaleToken.sol";
import { ILegacyMintableERC20, IERC165 } from "../thirdparty/optimism/ILegacyMintableERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { ISkaleTokenL2 } from "../interfaces/ISkaleTokenL2.sol";

/**
 * @title SkaleTokenL2
 * @dev Contract defines the SKALE token for L1-L2 interaction.
 */
contract SkaleTokenL2 is SkaleToken, ISkaleTokenL2 {
    using SafeMath for uint;

    /**
     * @dev Address of the L1 SKALE token contract.
     * Required by Optimism bridge to link L2 token to L1 counterpart.
     */
    address public immutable REMOTE_TOKEN;

    /**
     * @dev Address of the Optimism L2 Standard Bridge.
     * Required by Optimism bridge to authorize minting and burning.
     */
    address public immutable BRIDGE;

    constructor(
        address _contractManager,
        address[] memory defOps
    )
        SkaleToken(_contractManager, defOps)
    {}

    /**
     * @dev Sets L1 token address for bridge mapping.
     */
    function setL1Token(address l1TokenAddress) external override onlyOwner {
        require(l1TokenAddress != address(0), "L1 token address cannot be zero");
        l1Token = l1TokenAddress;
    }

    /**
     * @dev Mints tokens on L2 when deposited from L1.
     */
    function mint(address account, uint256 amount) external override onlyMinter returns (bool) {
        require(amount <= CAP.sub(totalSupply()), "Amount is too big");
        _mint(account, amount, "", "");
        return true;
    }

    /**
     * @dev Burns tokens on L2 when withdrawn to L1.
     */
    function burn(address account, uint256 amount) external override onlyMinter {
        _burn(account, amount, "", "");
    }

    /**
     * @dev Getter for REMOTE_TOKEN.
     */
    function remoteToken() public view returns (address) {
        return REMOTE_TOKEN;
    }

    /**
     * @dev Getter for BRIDGE.
     */
    function bridge() public view returns (address) {
        return BRIDGE;
    }
    /**
     * @dev ERC-165 interface detection.
     * Called by Optimism bridge to verify contract capabilities.
     */
     function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        bytes4 interfaceERC165 = type(IERC165).interfaceId;
        bytes4 interfaceLegacyMintableERC20 = type(ILegacyMintableERC20).interfaceId;
        return interfaceId == interfaceERC165 || interfaceId == interfaceLegacyMintableERC20;
    }
}
