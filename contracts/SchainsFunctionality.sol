/*
    SchainsFunctionality.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Artem Payvin

    SKALE Manager is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SKALE Manager is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with SKALE Manager.  If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity ^0.5.0;

import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/INodesData.sol";


interface ISchainsFunctionality1 {
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) external view returns (uint, uint);
    function createGroupForSchain(
        string calldata schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint partOfNode) external;
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) external view returns (uint);
    function deleteGroup(bytes32 groupIndex) external;
}


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality is Permissions, ISchainsFunctionality {

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

        require(typeOfSchain <= 5, "Invalid type of Schain");
        require(getSchainPrice(typeOfSchain, lifetime) <= deposit, "Not enough money to create Schain");

        //initialize Schain
        initializeSchainInSchainsData(
            name,
            from,
            deposit,
            lifetime);

        // create a group for Schain
        (numberOfNodes, partOfNode) = ISchainsFunctionality1(schainsFunctionality1Address).getNodesDataFromTypeOfSchain(typeOfSchain);

        ISchainsFunctionality1(schainsFunctionality1Address).createGroupForSchain(
            name, keccak256(abi.encodePacked(name)), numberOfNodes, partOfNode);

        emit SchainCreated(
            name, from, partOfNode, lifetime, numberOfNodes, deposit, nonce,
            keccak256(abi.encodePacked(name)), uint32(block.timestamp), gasleft());
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
            return 1e18;
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
            require(
                schainIndex < ISchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            ISchainsData(dataAddress).removeSchainForNode(nodesInGroup[i], schainIndex);
            addSpace(nodesInGroup[i], partOfNode);
        }

        ISchainsFunctionality1(schainsFunctionality1Address).deleteGroup(schainId);
        ISchainsData(dataAddress).removeSchain(schainId, from);
    }

    // function regenerateGroup(string memory schainName) public {
    //     address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
    //     bytes32 schainId = keccak256(abi.encodePacked(schainName));
    //     require(ISchainsData(dataAddress).isOwnerAddress(msg.sender, schainId));
    // }

    function deleteSchainByRoot(bytes32 schainId) public allow(executorName) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        address schainsFunctionality1Address = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsFunctionality1")));

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint partOfNode = ISchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = ISchainsFunctionality1(schainsFunctionality1Address).findSchainAtSchainsForNode(nodesInGroup[i], schainId);
            require(
                schainIndex < ISchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            ISchainsData(dataAddress).removeSchainForNode(nodesInGroup[i], schainIndex);
            addSpace(nodesInGroup[i], partOfNode);
        }

        ISchainsFunctionality1(schainsFunctionality1Address).deleteGroup(schainId);
        address from = ISchainsData(dataAddress).getSchainOwner(schainId);
        ISchainsData(dataAddress).removeSchain(schainId, from);
    }

    function initializeSchainInSchainsData(
        string memory name,
        address from,
        uint deposit,
        uint lifetime) internal
    {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(ISchainsData(dataAddress).isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        ISchainsData(dataAddress).initializeSchain(
            name,
            from,
            lifetime,
            deposit);
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
    function fallbackSchainParametersDataConverter(bytes memory data)
    internal pure returns (uint lifetime, uint typeOfSchain, uint16 nonce, string memory name)
    {
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

    /**
     * @dev addSpace - return occupied space to Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param partOfNode - divisor of given type of Schain
     */
    function addSpace(uint nodeIndex, uint partOfNode) internal {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint subarrayLink;
        bool isNodeFull;
        (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(nodeIndex);
        // adds space
        if (isNodeFull) {
            if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
                INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, IConstants(constantsAddress).TINY_DIVISOR() / partOfNode);
            } else if (partOfNode != 0) {
                INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, IConstants(constantsAddress).MEDIUM_DIVISOR() / partOfNode);
            } else {
                INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, partOfNode);
            }
        } else {
            if (partOfNode != 0) {
                INodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, IConstants(constantsAddress).TINY_DIVISOR() / partOfNode);
            } else {
                INodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, partOfNode);
            }
        }
    }
}
