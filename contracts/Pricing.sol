pragma solidity ^0.5.0;


import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";


contract Pricing is Permissions {
    bool log;
    uint public OPTIMAL_LOAD_PERCENTAGE = 80;
    uint ADJUSTMENT_SPEED = 1000;
    uint MIN_PRICE = 10**6;
    uint public totalNodes = 200;
    uint public workingNodes = 180;
    uint public price = 5000000;
    uint priceChange;
    uint MAX_PRICE = 2**256-1;
    uint lastUpdated = now;


    modifier isAdjusted() {
        if (now > lastUpdated + 1 seconds) {
            adjustPrice();
        }
        _;
    }


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function checkAllNodes() public isAdjusted {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();

        require(totalNodes != numberOfNodes, "No any changes on total nodes");
        workingNodes = numberOfNodes;

    }

    function checkWorkingNodes() public isAdjusted {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfActiveNodes = INodesData(nodesDataAddress).numberOfActiveNodes();

        require(workingNodes != numberOfActiveNodes, "No any changes on active nodes");
        workingNodes = numberOfActiveNodes;
    }

    function getTotalLoadPercentage() public returns (uint) {
        log = true;
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint64 numberOfSchains = ISchainsData(schainsDataAddress).numberOfSchains();
        uint sumLoadSchain;
        for (uint i = 0; i < numberOfSchains; i++) {
            bytes32 schain = ISchainsData(schainsDataAddress).schainsAtSystem(i);
            uint numberOfNodes = IGroupsData(schainsDataAddress).getNumberOfNodesInGroup(schain);
            uint part = ISchainsData(schainsDataAddress).getSchainsPartOfNode(schain);
            sumLoadSchain += (numberOfNodes*10**7)/part;
        }
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
        return uint(sumLoadSchain/(10**7*numberOfNodes));
    }

    function adjustPrice() public {
        uint loadPercentage = getTotalLoadPercentage();

        if (loadPercentage < OPTIMAL_LOAD_PERCENTAGE) {
            priceChange = (ADJUSTMENT_SPEED * price) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 1000000;
            price -= priceChange * ((now - lastUpdated) / 1);
            if (price < MIN_PRICE) {
                price = MIN_PRICE;
            }

        } else {
            priceChange = (ADJUSTMENT_SPEED * price) * (loadPercentage - OPTIMAL_LOAD_PERCENTAGE) / 1000000;
            price += priceChange * ((now - lastUpdated) / 1);
            // if (price > MAX_PRICE) {
            //     price = MAX_PRICE;
            // }
        }

        lastUpdated = now;
    }
}