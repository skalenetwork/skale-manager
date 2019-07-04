pragma solidity ^0.5.0;

import './Permissions.sol';

interface ISchainsData {
    function initializeSchain(string calldata name, address from, uint lifetime, uint deposit) external;
    function setSchainIndex(bytes32 schainId, address from) external;
    function removeSchain(bytes32 schainId, address from) external;
    function removeSchainForNode(uint nodeIndex, uint schainIndex) external;
    function isTimeExpired(bytes32 schainId) external view returns (bool);
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool);
    function isSchainNameAvailable(string calldata name) external view returns (bool);
    function getSchainsPartOfNode(bytes32 schainId) external view returns (uint);
    function getLengthOfSchainsForNode(uint nodeIndex) external view returns (uint);
}

interface IConstants {
    function NODE_DEPOSIT() external view returns (uint);
    function SECONDS_TO_YEAR() external view returns (uint32);
    //function NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN() external view returns (uint);
}

interface ISchainsFunctionality1 {
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) external view returns (uint, uint);
    function createGroupForSchain(string calldata schainName, bytes32 schainId, uint numberOfNodes, uint partOfNode) external;
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) external view returns (uint);
    function addSpace(uint nodeIndex, uint partOfNode) external;
    function deleteGroup(bytes32 groupIndex) external;
}

interface IGroupsData {
    function getNodesInGroup(bytes32 schainId) external view returns (uint[] memory);
}


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality is Permissions {
    
    // informs that Schain is created
    event SchainCreated(
        string name,
        address owner,
        uint partOfNode,
        uint lifetime,
        uint numberOfNodes,
        uint deposit,
        uint16 nonce,
        bytes32 groupIndex,
        uint32 time,
        uint gasSpend
    );

    string executorName;
    string dataName;

    constructor(string memory newExecutorName, string memory newDataName, address newContractsAddress) Permissions(newContractsAddress) public {
        executorName = newExecutorName;
        dataName = newDataName;
    }

    /**
     * @dev addSchain - create Schain in the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param deposit - received amoung of SKL
     * @param data - Schain's data
     */
    function addSchain(address from, uint deposit, bytes memory data) public allow(executorName) {
        uint lifetime;
        uint numberOfNodes;
        uint typeOfSchain;
        uint16 nonce;
        string memory name;
        uint partOfNode;

        address schainsFunctionality1Address = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality1")));

        (lifetime, typeOfSchain, nonce, name) = fallbackSchainParametersDataConverter(data);

        require(getSchainPrice(typeOfSchain, lifetime) <= deposit, "Not enough money to create Schain");

        require(typeOfSchain <= 5, "Invalid type of Schain");

        

        //initialize Schain
        initializeSchainInSchainsData(name, from, deposit, lifetime);


        // create a group for Schain
        (numberOfNodes, partOfNode) = ISchainsFunctionality1(schainsFunctionality1Address).getNodesDataFromTypeOfSchain(typeOfSchain);

        ISchainsFunctionality1(schainsFunctionality1Address).createGroupForSchain(name, keccak256(abi.encodePacked(name)), numberOfNodes, partOfNode);

        

        emit SchainCreated(name, from, partOfNode, lifetime, numberOfNodes, deposit, nonce, keccak256(abi.encodePacked(name)), uint32(block.timestamp), gasleft());
    }

    /**
     * @dev getSchainPrice - returns current price for given Schain
     * @param typeOfSchain - type of Schain
     * @param lifetime - lifetime of Schain
     * @return current price for given Schain
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        address schainsFunctionality1Address = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality1")));
        uint nodeDeposit = IConstants(constantsAddress).NODE_DEPOSIT();
        uint numberOfNodes;
        uint divisor;
        (numberOfNodes, divisor) = ISchainsFunctionality1(schainsFunctionality1Address).getNodesDataFromTypeOfSchain(typeOfSchain);
        /*uint up;
        uint down;
        (up, down) = coefficientForPrice(constantsAddress);*/
        if (divisor == 0) {
            return 1000000000000000000;
        } else {
            uint up = nodeDeposit * numberOfNodes * 2 * lifetime;
            uint down = divisor * IConstants(constantsAddress).SECONDS_TO_YEAR();
            return up / down;
        }
    }

    /**
     * @dev getSchainNodes - returns Nodes which contained in given Schain
     * @param schainName - name of Schain
     * @return array of concatenated parameters: nodeIndex, ip, port which contained in Schain
     */
    /*function getSchainNodes(string schainName) public view returns (bytes16[] memory schainNodes) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        bytes32 schainId = keccak256(abi.encodePacked(schainName));
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        schainNodes = new bytes16[](nodesInGroup.length);
        for (uint indexOfNodes = 0; indexOfNodes < nodesInGroup.length; indexOfNodes++) {
            schainNodes[indexOfNodes] = getBytesParameter(nodesInGroup[indexOfNodes]);
        }
    }*/

    /**
     * @dev deleteSchain - removes Schain from the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param schainId - hash by Schain name
     */
    function deleteSchain(address from, bytes32 schainId) public allow(executorName) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        //require(ISchainsData(dataAddress).isTimeExpired(schainId), "Schain lifetime did not end");
        require(ISchainsData(dataAddress).isOwnerAddress(from, schainId), "Message sender is not an owner of Schain");
        address schainsFunctionality1Address = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality1")));

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint partOfNode = ISchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = ISchainsFunctionality1(schainsFunctionality1Address).findSchainAtSchainsForNode(nodesInGroup[i], schainId);
            require(schainIndex < ISchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]), "Some Node does not contain given Schain");
            ISchainsData(dataAddress).removeSchainForNode(nodesInGroup[i], schainIndex);
            ISchainsFunctionality1(schainsFunctionality1Address).addSpace(nodesInGroup[i], partOfNode);
        }

        ISchainsFunctionality1(schainsFunctionality1Address).deleteGroup(schainId);
        ISchainsData(dataAddress).removeSchain(schainId, from);
    }

    function initializeSchainInSchainsData(string memory name, address from, uint deposit, uint lifetime) internal {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(ISchainsData(dataAddress).isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        ISchainsData(dataAddress).initializeSchain(name, from, lifetime, deposit);
        ISchainsData(dataAddress).setSchainIndex(keccak256(abi.encodePacked(name)), from);
    }

    /**
     * @dev fallbackSchainParameterDataConverter - converts data from bytes to normal parameters
     * @param data - concatenated parameters
     * @return lifetime
     * @return typeOfSchain
     * @return nonce
     * @return name
     */
    function fallbackSchainParametersDataConverter(bytes memory data) internal pure returns (uint lifetime, uint typeOfSchain, uint16 nonce, string memory name) {
        require(data.length > 36, "Incorrect bytes data config");
        bytes32 lifetimeInBytes;
        bytes1 typeOfSchainInBytes;
        bytes2 nonceInBytes;
        assembly {
            lifetimeInBytes := mload(add(data, 33))
            typeOfSchainInBytes := mload(add(data, 65))
            nonceInBytes := mload(add(data, 66))
        }
        typeOfSchain = uint(uint8(typeOfSchainInBytes));
        lifetime = uint(lifetimeInBytes);
        nonce = uint16(nonceInBytes);
        name = new string(data.length - 36);
        for (uint i = 0; i < bytes(name).length; ++i) {
            bytes(name)[i] = data[36 + i];
        }
    }
}
