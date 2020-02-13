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

pragma solidity ^0.5.3;

import "./Permissions.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/ISchainsFunctionalityInternal.sol";
import "./interfaces/INodesData.sol";
import "./SchainsData.sol";


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality is Permissions, ISchainsFunctionality {

    struct SchainParameters {
        uint lifetime;
        uint typeOfSchain;
        uint16 nonce;
        string name;
    }

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

    event SchainDeleted(
        address owner,
        string name,
        bytes32 indexed schainId
    );

    event NodeRotated(
        bytes32 groupIndex,
        uint oldNode,
        uint newNode
    );

    event NodeAdded(
        bytes32 groupIndex,
        uint newNode
    );

    string executorName;
    string dataName;

    /**
     * @dev addSchain - create Schain in the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param deposit - received amoung of SKL
     * @param data - Schain's data
     */
    function addSchain(address from, uint deposit, bytes calldata data) external allow(executorName) {
        uint numberOfNodes;
        uint8 partOfNode;

        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");

        SchainParameters memory schainParameters = fallbackSchainParametersDataConverter(data);

        require(schainParameters.typeOfSchain <= 5, "Invalid type of Schain");
        require(getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime) <= deposit, "Not enough money to create Schain");

        //initialize Schain
        initializeSchainInSchainsData(
            schainParameters.name,
            from,
            deposit,
            schainParameters.lifetime);

        // create a group for Schain
        (numberOfNodes, partOfNode) = ISchainsFunctionalityInternal(
            schainsFunctionalityInternalAddress
        ).getNodesDataFromTypeOfSchain(schainParameters.typeOfSchain);

        ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).createGroupForSchain(
            schainParameters.name, keccak256(abi.encodePacked(schainParameters.name)), numberOfNodes, partOfNode);

        emit SchainCreated(
            schainParameters.name, from, partOfNode, schainParameters.lifetime, numberOfNodes, deposit, schainParameters.nonce,
            keccak256(abi.encodePacked(schainParameters.name)), uint32(block.timestamp), gasleft());
    }

    /**
     * @dev deleteSchain - removes Schain from the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param name - Schain name
     */
    function deleteSchain(address from, string calldata name) external allow(executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract(dataName);
        require(SchainsData(dataAddress).isOwnerAddress(from, schainId), "Message sender is not an owner of Schain");
        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromSchain(nodesInGroup[i], schainId);
            addSpace(nodesInGroup[i], partOfNode);
        }
        ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).deleteGroup(schainId);
        SchainsData(dataAddress).removeSchain(schainId, from);
        emit SchainDeleted(from, name, schainId);
    }

    function deleteSchainByRoot(string calldata name) external allow(executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract(dataName);
        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromSchain(nodesInGroup[i], schainId);
            addSpace(nodesInGroup[i], partOfNode);
        }
        ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).deleteGroup(schainId);
        address from = SchainsData(dataAddress).getSchainOwner(schainId);
        SchainsData(dataAddress).removeSchain(schainId, from);
        emit SchainDeleted(from, name, schainId);
    }

    function rotateNode(uint nodeIndex, bytes32 schainId) external allowTwo("SkaleDKG", executorName) {
        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");
        uint newNodeIndex;
        newNodeIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).replaceNode(nodeIndex, schainId);
        emit NodeRotated(schainId, nodeIndex, newNodeIndex);
    }

    function restartSchainCreation(string calldata name) external allow(executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = contractManager.getContract(dataName);
        require(IGroupsData(dataAddress).isGroupFailedDKG(schainId), "DKG success");
        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");
        uint[] memory possibleNodes = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).isEnoughNodes(schainId);
        require(possibleNodes.length > 0, "No any free Nodes for rotation");
        uint newNodeIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).selectNewNode(schainId);
        emit NodeAdded(schainId, newNodeIndex);
    }

    function initialize(address newContractsAddress) public initializer {
        Permissions.initialize(newContractsAddress);
        executorName = "SkaleManager";
        dataName = "SchainsData";
    }

    /**
     * @dev getSchainPrice - returns current price for given Schain
     * @param typeOfSchain - type of Schain
     * @param lifetime - lifetime of Schain
     * @return current price for given Schain
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        address constantsAddress = contractManager.getContract("ConstantsHolder");
        address schainsFunctionalityInternalAddress = contractManager.getContract("SchainsFunctionalityInternal");
        uint nodeDeposit = IConstants(constantsAddress).NODE_DEPOSIT();
        uint numberOfNodes;
        uint8 divisor;
        (numberOfNodes, divisor) = ISchainsFunctionalityInternal(
            schainsFunctionalityInternalAddress
        ).getNodesDataFromTypeOfSchain(typeOfSchain);
        // /*uint up;
        // uint down;
        // (up, down) = coefficientForPrice(constantsAddress);*/
        if (divisor == 0) {
            return 1e18;
        } else {
            uint up = nodeDeposit.mul(numberOfNodes.mul(lifetime.mul(2)));
            uint down = uint(uint(IConstants(constantsAddress).TINY_DIVISOR()).div(divisor).mul(uint(IConstants(constantsAddress).SECONDS_TO_YEAR())));
            return up.div(down);
        }
    }

    function initializeSchainInSchainsData(
        string memory name,
        address from,
        uint deposit,
        uint lifetime) internal
    {
        address dataAddress = contractManager.getContract(dataName);
        require(SchainsData(dataAddress).isSchainNameAvailable(name), "Schain name is not available");

        // initialize Schain
        SchainsData(dataAddress).initializeSchain(
            name,
            from,
            lifetime,
            deposit);
        SchainsData(dataAddress).setSchainIndex(keccak256(abi.encodePacked(name)), from);
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
    internal pure returns (SchainParameters memory schainParameters)
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
        schainParameters.typeOfSchain = uint(uint8(typeOfSchainInBytes));
        schainParameters.lifetime = uint(lifetimeInBytes);
        schainParameters.nonce = uint16(nonceInBytes);
        schainParameters.name = new string(data.length - 36);
        for (uint i = 0; i < bytes(schainParameters.name).length; ++i) {
            bytes(schainParameters.name)[i] = data[36 + i];
        }
    }

    /**
     * @dev addSpace - return occupied space to Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param partOfNode - divisor of given type of Schain
     */
    function addSpace(uint nodeIndex, uint8 partOfNode) internal {
        address nodesDataAddress = contractManager.getContract("NodesData");
        INodesData(nodesDataAddress).addSpaceToNode(nodeIndex, partOfNode);
    }
}
