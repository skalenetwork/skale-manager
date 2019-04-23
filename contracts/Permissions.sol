pragma solidity ^0.4.24;

import "./ContractManager.sol";


/**
 * @title Permissions - connected module for Upgradeable approach, knows ContractManager
 * @author Artem Payvin
 */
contract Permissions is Ownable {
    
    // address of ContractManager
    address contractsAddress;

    /**
     * @dev allow - throws if called by any account and contract other than the owner 
     * or `contractName` contract
     * @param contractName - human readable name of contract
     */
    modifier allow(string contractName) {
        require(ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(contractName))) == msg.sender || owner == msg.sender, "Message sender is invalid");
        _;
    }

    /**
     * @dev constructor - sets current address of ContractManager
     * @param newContractsAddress - current address of ContractManager
     */
    constructor(address newContractsAddress) public {
        contractsAddress = newContractsAddress;
    }
}
