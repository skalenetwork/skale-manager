// SPDX-License-Identifier: AGPL-3.0-only

/*
    Pricing.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin
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

pragma solidity 0.8.17;

import { IPricing } from "@skalenetwork/skale-manager-interfaces/IPricing.sol";
import { ISchainsInternal } from "@skalenetwork/skale-manager-interfaces/ISchainsInternal.sol";
import { INodes } from "@skalenetwork/skale-manager-interfaces/INodes.sol";

import { Permissions } from "./Permissions.sol";
import { ConstantsHolder } from "./ConstantsHolder.sol";

/**
 * @title Pricing
 * @dev Contains pricing operations for SKALE network.
 */
contract Pricing is Permissions, IPricing {

    uint256 public constant INITIAL_PRICE = 5 * 10**6;

    uint256 public price;
    uint256 public totalNodes;
    uint256 public lastUpdated;

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
        lastUpdated = block.timestamp;
        price = INITIAL_PRICE;
    }

    function initNodes() external override {
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        totalNodes = nodes.getNumberOnlineNodes();
    }

    /**
     * @dev Adjust the schain price based on network capacity and demand.
     *
     * Requirements:
     *
     * - Cooldown time has exceeded.
     */
    function adjustPrice() external override {
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));
        require(
            block.timestamp > lastUpdated + constantsHolder.COOLDOWN_TIME(),
            "It's not a time to update a price"
        );
        checkAllNodes();
        uint256 load = _getTotalLoad();
        uint256 capacity = _getTotalCapacity();

        bool networkIsOverloaded = load * 100 > constantsHolder.OPTIMAL_LOAD_PERCENTAGE() * capacity;
        uint256 loadDiff;
        if (networkIsOverloaded) {
            loadDiff = load * 100 - constantsHolder.OPTIMAL_LOAD_PERCENTAGE() * capacity;
        } else {
            loadDiff = constantsHolder.OPTIMAL_LOAD_PERCENTAGE() * capacity - load * 100;
        }

        uint256 priceChangeSpeedMultipliedByCapacityAndMinPrice =
            constantsHolder.ADJUSTMENT_SPEED() * loadDiff * price;

        uint256 timeSkipped = block.timestamp - lastUpdated;

        uint256 priceChange = priceChangeSpeedMultipliedByCapacityAndMinPrice
            * timeSkipped
            / constantsHolder.COOLDOWN_TIME()
            / capacity
            / constantsHolder.MIN_PRICE();

        if (networkIsOverloaded) {
            assert(priceChange > 0);
            price = price + priceChange;
        } else {
            if (priceChange > price) {
                price = constantsHolder.MIN_PRICE();
            } else {
                price = price - priceChange;
                if (price < constantsHolder.MIN_PRICE()) {
                    price = constantsHolder.MIN_PRICE();
                }
            }
        }
        lastUpdated = block.timestamp;
    }

    /**
     * @dev Returns the total load percentage.
     */
    function getTotalLoadPercentage() external view override returns (uint256 load) {
        return _getTotalLoad() * 100 / _getTotalCapacity();
    }

    function checkAllNodes() public override {
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        uint256 numberOfActiveNodes = nodes.getNumberOnlineNodes();

        require(totalNodes != numberOfActiveNodes, "No changes to node supply");
        totalNodes = numberOfActiveNodes;
    }

    function _getTotalLoad() private view returns (uint256 load) {
        ISchainsInternal schainsInternal = ISchainsInternal(contractManager.getContract("SchainsInternal"));

        load = 0;
        uint256 numberOfSchains = schainsInternal.numberOfSchains();
        for (uint256 i = 0; i < numberOfSchains; i++) {
            bytes32 schain = schainsInternal.schainsAtSystem(i);
            uint256 numberOfNodesInSchain = schainsInternal.getNumberOfNodesInGroup(schain);
            uint256 part = schainsInternal.getSchainsPartOfNode(schain);
            load = load + numberOfNodesInSchain * part;
        }
        return load;
    }

    function _getTotalCapacity() private view returns (uint256 capacity) {
        INodes nodes = INodes(contractManager.getContract("Nodes"));
        ConstantsHolder constantsHolder = ConstantsHolder(contractManager.getContract("ConstantsHolder"));

        return nodes.getNumberOnlineNodes() * constantsHolder.TOTAL_SPACE_ON_NODE();
    }
}
