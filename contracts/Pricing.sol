pragma solidity ^0.5.0;


import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";


contract Pricing is Permissions {
    uint public constant OPTIMAL_LOAD_PERCENTAGE = 80;
    uint public constant ADJUSTMENT_SPEED = 1000;
    uint constant MIN_PRICE = 10**6;
    uint public totalNodes;
    uint public workingNodes;
    uint public price = 5*10**6;
    uint lastUpdated;
    uint public constant COOLDOWN_TIME = 60;



    constructor(address newContractsAddress) Permissions(newContractsAddress) public {
        lastUpdated = now;
    }

    function initNodes() public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        // totalNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        // workingNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
        totalNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
    }

    function checkAllNodes() public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        uint numberOfActiveNodes = INodesData(nodesDataAddress).numberOfActiveNodes();

        // require(totalNodes != numberOfNodes || workingNodes != numberOfActiveNodes, "No any changes on nodes"); //?
        // totalNodes = numberOfNodes;
        // workingNodes = numberOfActiveNodes;
        require(totalNodes != numberOfActiveNodes, "No any changes on nodes");
        totalNodes = numberOfActiveNodes;

    }

    function adjustPrice() public {
        require(now > lastUpdated + COOLDOWN_TIME, "It's not a time to update a price");
        checkAllNodes();
        uint loadPercentage = getTotalLoadPercentage();
        uint priceChange;
        uint timeSkipped;

        if (loadPercentage < OPTIMAL_LOAD_PERCENTAGE) {
            priceChange = (ADJUSTMENT_SPEED * price) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 10**6;
            timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
            require(price - priceChange * timeSkipped < price, "New price should be less than old price");
            price -= priceChange * timeSkipped;
            if (price < MIN_PRICE) {
                price = MIN_PRICE;
            }

        } else {
            priceChange = (ADJUSTMENT_SPEED * price) * (loadPercentage - OPTIMAL_LOAD_PERCENTAGE) / 10**6;
            timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
            require(price + priceChange * timeSkipped > price, "New price should be greater than old price");
            price += priceChange * timeSkipped;
        }

        lastUpdated = now;
    }

    function getTotalLoadPercentage() public view returns (uint) {
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        uint sumNode = 0;
        for (uint i = 0; i < numberOfNodes; i++) {
            bytes32[] memory getSchainIdsForNode = ISchainsData(schainsDataAddress).getSchainIdsForNode(i);
            for (uint j = 0; j < getSchainIdsForNode.length; j++) {
                uint partOfNode = ISchainsData(schainsDataAddress).getSchainsPartOfNode(getSchainIdsForNode[j]);
                bool isNodeLeft = INodesData(nodesDataAddress).isNodeLeft(i);
                if (partOfNode != 0 && !isNodeLeft) {
                    sumNode += 128/partOfNode;
                }
            }
        }
        return (sumNode*100)/(128*numberOfNodes);
    }
}
