pragma solidity ^0.5.0;


import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";


contract Pricing is Permissions {
    bool log;
    uint public constant OPTIMAL_LOAD_PERCENTAGE = 80;
    uint public constant ADJUSTMENT_SPEED = 1000;
    uint constant MIN_PRICE = 10**6;
    uint public totalNodes = 200;
    uint public workingNodes = 180;
    uint public price = 5000000;
    uint constant MAX_PRICE = 2**256-1;
    uint lastUpdated = now;
    uint public constant COOLDOWN_TIME = 60;



    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function initNodes() public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        totalNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        workingNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
    }

    function checkAllNodes() public {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        uint numberOfActiveNodes = INodesData(nodesDataAddress).numberOfActiveNodes();

        require(totalNodes != numberOfNodes || workingNodes != numberOfActiveNodes, "No any changes on nodes");
        totalNodes = numberOfNodes;
        workingNodes = numberOfActiveNodes;

    }

    function adjustPrice() public {
        require(now > lastUpdated + COOLDOWN_TIME, "It's not a time to update a price");
        checkAllNodes();
        uint loadPercentage = getTotalLoadPercentage();
        uint priceChange;
        uint timeSkipped;

        if (loadPercentage < OPTIMAL_LOAD_PERCENTAGE) {
            priceChange = (ADJUSTMENT_SPEED * price) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 1000000;
            timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
            require(price - priceChange * timeSkipped < price, "New price should be less than old price");
            price -= priceChange * timeSkipped;
            if (price < MIN_PRICE) {
                price = MIN_PRICE;
            }

        } else {
            priceChange = (ADJUSTMENT_SPEED * price) * (loadPercentage - OPTIMAL_LOAD_PERCENTAGE) / 1000000;
            timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
            require(price + priceChange * timeSkipped > price, "New price should be greater than old price");
            price += priceChange * timeSkipped;
        }

        lastUpdated = now;
    }

    function getTotalLoadPercentage0() public view returns (uint) {
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint64 numberOfSchains = ISchainsData(schainsDataAddress).numberOfSchains();
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        uint sumLoadSchain;
        for (uint i = 0; i < numberOfSchains; i++) {
            bytes32 schain = ISchainsData(schainsDataAddress).schainsAtSystem(i);
            uint numberOfNodesInGroup = IGroupsData(schainsDataAddress).getNumberOfNodesInGroup(schain);
            uint part = ISchainsData(schainsDataAddress).getSchainsPartOfNode(schain);
            sumLoadSchain += (numberOfNodesInGroup*10**7)/part;
        }
        return uint(sumLoadSchain/(10**5*numberOfNodes));
    }

    function getTotalLoadPercentage() public view returns (uint) {
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        // uint64 numberOfSchains = ISchainsData(schainsDataAddress).numberOfSchains();
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        uint sumNode;
        for (uint i = 0; i < numberOfNodes; i++) {
            bytes32[] memory getSchainIdsForNode = ISchainsData(schainsDataAddress).getSchainIdsForNode(i);
            // uint sumLoadSchain = 0;
            for (uint j = 0; j < getSchainIdsForNode.length; j++) {
                uint partOfNode = ISchainsData(schainsDataAddress).getSchainsPartOfNode(getSchainIdsForNode[j]);
                bool isNodeLeft = INodesData(nodesDataAddress).isNodeLeft(i);
                if (partOfNode != 0 && !isNodeLeft) {
                    sumNode += 128/partOfNode;
                }
            }
        }
        return uint(sumNode*100)/(128*numberOfNodes);
    }
}
