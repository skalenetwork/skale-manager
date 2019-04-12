pragma solidity ^0.4.24;

import "./ContractManager.sol";


contract Permissions is Ownable {
    
    address contractsAddress;

    modifier allow(string contractName) {
        require(ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(contractName))) == msg.sender || owner == msg.sender, "Message sender is invalid");
        _;
    }

    constructor(address newContractsAddress) public {
        contractsAddress = newContractsAddress;
    }
}
