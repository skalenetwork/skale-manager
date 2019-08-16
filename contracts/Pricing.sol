pragma solidity ^0.5.0;


import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";


contract Pricing is Permissions {
    event Log(address adr);

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {

    }

    function getTotalLoadPercentage() public view returns (uint sumNode) {
        // sumNode = 0;
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        emit Log(adr)
        // revert("Break");
        // uint numberOfSchains = uint(ISchainsData(schainsDataAddress).numberOfSchains());
        // for (uint i = 0; i < 1; i++) {
            // bytes32[] memory schainsForNodesArray = ISchainsData(schainsDataAddress).schainsForNodesArray(i);
            // uint sumLoadSchain = 0;
            // for (uint j = 0; j < schainsForNodesArray.length; j++) {
            //     uint partOfNode = ISchainsData(schainsDataAddress).getSchainPartOfNode(schainsForNodesArray[i]);
            //     if (partOfNode != 0) {
            //         sumLoadSchain += 128/partOfNode;
            //     }
            // }
            // sumNode += sumLoadSchain/numberOfSchains;
        // }
    }
}