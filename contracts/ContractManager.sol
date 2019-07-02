pragma solidity ^0.5.0;

import "./Ownable.sol";

/**
 * @title Main contract in upgradeable approach. This contract contain actual
 * contracts for this moment in skale manager system by human name.
 * @author Artem Payvin
 */
contract ContractManager is Ownable {

    // mapping of actual smart contracts addresses
    mapping (bytes32 => address) public contracts;

    event ContractUpgraded(string contractsName, address contractsAddress);

    /**
     * Adds actual contract to mapping of actual contract addresses
     * @param contractsName - contracts name in skale manager system
     * @param newContractsAddress - contracts address in skale manager system
     */
    function setContractsAddress(string memory contractsName, address newContractsAddress) public onlyOwner {
        // check newContractsAddress is not equal zero
        require(newContractsAddress != address(0), "New address is equal zero");
        // create hash of contractsName
        bytes32 contractId = keccak256(abi.encodePacked(contractsName));
        // check newContractsAddress is not equal the previous contract's address
        require(contracts[contractId] != newContractsAddress, "Contract is already added");
        uint length;
        assembly {
            length := extcodesize(newContractsAddress)
        }
        // check newContractsAddress contains code
        require(length > 0, "Given contracts address is not contain code");
        // add newContractsAddress to mapping of actual contract addresses
        contracts[contractId] = newContractsAddress;
        emit ContractUpgraded(contractsName, newContractsAddress);
    }
}
