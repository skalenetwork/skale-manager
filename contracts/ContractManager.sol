pragma solidity ^0.4.24;

import "./Ownable.sol";


contract ContractManager is Ownable {

    mapping (bytes32 => address) public contracts;

    event ContractUpgraded(string contractsName, address contractsAddress);

    function setContractsAddress(string contractsName, address newContractsAddress) public onlyOwner {
        require(newContractsAddress != address(0), "New address is equal zero");
        bytes32 contractId = keccak256(abi.encodePacked(contractsName));
        require(contracts[contractId] != newContractsAddress, "Contract is already added");
        uint length;
        assembly {
            length := extcodesize(newContractsAddress)
        }
        require(length > 0, "Given contracts address is not contain code");
        contracts[contractId] = newContractsAddress;
        emit ContractUpgraded(contractsName, newContractsAddress);
    }
}
