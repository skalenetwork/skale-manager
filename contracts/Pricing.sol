pragma solidity ^0.5.0;


import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";


contract Pricing is Permissions {


    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function getTotalLoadPercentage() public view returns (uint sumNode) {
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint64 numberOfSchains = ISchainsData(schainsDataAddress).numberOfSchains();
        for (uint i = 0; i < numberOfSchains; i++) {
            bytes32[] memory schainsForNodesArray = ISchainsData(schainsDataAddress).schainsForNodesArray(i);
            uint sumLoadSchain = 0;
            for (uint j = 0; j < schainsForNodesArray.length; j++) {
                uint partOfNode = ISchainsData(schainsDataAddress).getSchainPartOfNode(schainsForNodesArray[i]);
                if (partOfNode != 0) {
                    sumLoadSchain += 128/partOfNode;
                }
            }
            sumNode += sumLoadSchain/numberOfSchains;
        }
    }
}