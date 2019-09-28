/*
    SchainsFunctionalityInternal.sol - SKALE Manager
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

import "./GroupsFunctionality.sol";
import "./interfaces/INodesData.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IConstants.sol";


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionalityInternal is GroupsFunctionality {
    // informs that Schain based on some Nodes
    event SchainNodes(
        string name,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );



    constructor(string memory newExecutorName,
                string memory newDataName,
                address newContractsAddress)
                GroupsFunctionality(newExecutorName, newDataName, newContractsAddress) public {

    }

    /**
     * @dev createGroupForSchain - creates Group for Schain
     * @param schainName - name of Schain
     * @param schainId - hash by name of Schain
     * @param numberOfNodes - number of Nodes needed for this Schain
     * @param partOfNode - divisor of given type of Schain
     */
    function createGroupForSchain(
        string memory schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint partOfNode) public allow(executorName)
    {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        addGroup(schainId, numberOfNodes, bytes32(partOfNode));
        uint[] memory numberOfNodesInGroup = generateGroup(schainId);
        ISchainsData(dataAddress).setSchainPartOfNode(schainId, partOfNode);
        emit SchainNodes(
            schainName,
            schainId,
            numberOfNodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev getNodesDataFromTypeOfSchain - returns number if Nodes
     * and part of Node which needed to this Schain
     * @param typeOfSchain - type of Schain
     * @return numberOfNodes - number of Nodes needed to this Schain
     * @return partOfNode - divisor of given type of Schain
     */
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) public view returns (uint numberOfNodes, uint partOfNode) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_SCHAIN();
        if (typeOfSchain == 1) {
            partOfNode = IConstants(constantsAddress).TINY_DIVISOR();
        } else if (typeOfSchain == 2) {
            partOfNode = IConstants(constantsAddress).SMALL_DIVISOR();
        } else if (typeOfSchain == 3) {
            partOfNode = IConstants(constantsAddress).MEDIUM_DIVISOR();
        } else if (typeOfSchain == 4) {
            partOfNode = 0;
            numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_TEST_SCHAIN();
        } else if (typeOfSchain == 5) {
            partOfNode = IConstants(constantsAddress).MEDIUM_TEST_DIVISOR();
            numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN();
        } else {
            revert("Bad schain type");
        }
    }

    /**
     * @dev findSchainAtSchainsForNode - finds index of Schain at schainsForNode array
     * @param nodeIndex - index of Node at common array of Nodes
     * @param schainId - hash of name of Schain
     * @return index of Schain at schainsForNode array
     */
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) public view returns (uint) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        uint length = ISchainsData(dataAddress).getLengthOfSchainsForNode(nodeIndex);
        for (uint i = 0; i < length; i++) {
            if (ISchainsData(dataAddress).schainsForNodes(nodeIndex, i) == schainId) {
                return i;
            }
        }
        return length;
    }

    /**
     * @dev selectNodeToGroup - pseudo-randomly select new Node for Schain
     * @param schainId - hash of name of Schain
     * @return schainId - hash of name of Schain which needed for emitting event
     * @return nodeIndex - in
     */
    function selectNodeToGroup(bytes32 schainId) public returns (bytes32, uint) {
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint partOfNode = ISchainsData(schainsDataAddress).getSchainsPartOfNode(schainId);
        uint hash = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), schainId)));
        uint numberOfNodes;
        uint space;
        (numberOfNodes, space) = setNumberOfNodesInGroup(schainId, partOfNode, schainsDataAddress);
        uint indexOfNode;
        uint nodeIndex;
        uint iterations = 0;
        while (iterations < 200) {
            indexOfNode = hash % numberOfNodes;
            nodeIndex = returnValidNodeIndex(partOfNode, indexOfNode);
            if (comparator(indexOfNode, partOfNode, space) && !IGroupsData(schainsDataAddress).isExceptionNode(schainId, nodeIndex)) {
                IGroupsData(schainsDataAddress).setException(schainId, nodeIndex);
                IGroupsData(schainsDataAddress).setNodeInGroup(schainId, nodeIndex);
                ISchainsData(schainsDataAddress).addSchainForNode(nodeIndex, schainId);
                require(removeSpace(nodeIndex, space), "Could not remove space from Node for rotation");
                return (schainId, nodeIndex);
            }
            hash = uint(keccak256(abi.encodePacked(hash, indexOfNode)));
            iterations++;
        }
        require(iterations < 200, "Old Node is not replaced? Try it later");
    }

    /**
     * @dev generateGroup - generates Group for Schain
     * @param groupIndex - index of Group
     */
    function generateGroup(bytes32 groupIndex) internal returns (uint[] memory nodesInGroup) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(IGroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");
        bytes32 groupData = IGroupsData(dataAddress).getGroupData(groupIndex);
        uint hash = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
        uint numberOfNodes;
        uint space;

        (numberOfNodes, space) = setNumberOfNodesInGroup(groupIndex, uint(groupData), dataAddress);
        uint indexOfNode;
        uint nodeIndex;
        uint8 iterations = 0;
        uint index = 0;
        nodesInGroup = new uint[](IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex));


        // generate random group algorithm
        while (index < IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex) && iterations < 200) {

            // new random index of Node
            indexOfNode = hash % numberOfNodes;
            nodeIndex = returnValidNodeIndex(uint(groupData), indexOfNode);


            // checks that this not is available, enough space to allocate resources
            // and have not chosen to this group
            if (comparator(indexOfNode, uint(groupData), space) && !IGroupsData(dataAddress).isExceptionNode(groupIndex, nodeIndex)) {
                // adds Node to the Group
                IGroupsData(dataAddress).setException(groupIndex, nodeIndex);
                nodesInGroup[index] = nodeIndex;
                ISchainsData(dataAddress).addSchainForNode(nodeIndex, groupIndex);
                require(removeSpace(nodeIndex, space), "Could not remove space from Node");
                index++;
            }
            hash = uint(keccak256(abi.encodePacked(hash, indexOfNode)));
            iterations++;
        }
        // checks that this algorithm took less than 200 iterations
        require(iterations < 200, "Schain is not created? Try it later");
        // set generated group
        IGroupsData(dataAddress).setNodesInGroup(groupIndex, nodesInGroup);
        emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev comparator - checks that Node is fitted to be a part of Schain
     * @param indexOfNode - index of Node at the Full Nodes or Fractional Nodes array
     * @param partOfNode - divisor of given type of Schain
     * @param space - needed space to occupy
     * @return if fitted - true, else - false
     */
    function comparator(uint indexOfNode, uint partOfNode, uint space) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint freeSpace = 0;
        uint nodeIndex = uint(-1);
        // get nodeIndex and free space of this Node
        if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
            (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fullNodes(indexOfNode);
        } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
            (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fractionalNodes(indexOfNode);
        } else if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR() || partOfNode == 0) {
            bool isNodeFull;
            uint subarrayLink;
            (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(indexOfNode);
            if (isNodeFull) {
                (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fullNodes(subarrayLink);
            } else {
                (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fractionalNodes(subarrayLink);
            }
        } else {
            revert("Divisor does not match any valid schain type");
        }
        require(nodeIndex != uint(-1), "nodeIndex is not set");
        return INodesData(nodesDataAddress).isNodeActive(nodeIndex) && (freeSpace >= space);
    }

    /**
     * @dev returnValidNodeIndex - returns nodeIndex from indexOfNode at Full Nodes
     * and Fractional Nodes array
     * @param partOfNode - divisor of given type of Schain
     * @param indexOfNode - index of Node at the Full Nodes or Fractional Nodes array
     * @return nodeIndex - index of Node at common array of Nodes
     */
    function returnValidNodeIndex(uint partOfNode, uint indexOfNode) internal view returns (uint nodeIndex) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint space;
        if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
            (nodeIndex, space) = INodesData(nodesDataAddress).fullNodes(indexOfNode);
        } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
            (nodeIndex, space) = INodesData(nodesDataAddress).fractionalNodes(indexOfNode);
        } else {
            return indexOfNode;
        }
    }

    /**
     * @dev removeSpace - occupy space of given Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param space - needed space to occupy
     * @return if ouccupied - true, else - false
     */
    function removeSpace(uint nodeIndex, uint space) internal returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint subarrayLink;
        bool isNodeFull;
        (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(nodeIndex);
        if (isNodeFull) {
            return INodesData(nodesDataAddress).removeSpaceFromFullNode(subarrayLink, space);
        } else {
            return INodesData(nodesDataAddress).removeSpaceFromFractionalNode(subarrayLink, space);
        }
    }

    /**
     * @dev setNumberOfNodesInGroup - checks is Nodes enough to create Schain
     * and returns number of Nodes in group
     * and how much space would be occupied on its, based on given type of Schain
     * @param groupIndex - Groups identifier
     * @param partOfNode - divisor of given type of Schain
     * @param dataAddress - address of Data contract
     * @return numberOfNodes - number of Nodes in Group
     * @return space - needed space to occupy
     */
    function setNumberOfNodesInGroup(bytes32 groupIndex, uint partOfNode, address dataAddress)
    internal view returns (uint numberOfNodes, uint space)
    {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint numberOfAvailableNodes = 0;
        uint needNodes = 1;
        bool nodesEnough;
        if (IGroupsData(schainsDataAddress).getNumberOfNodesInGroup(groupIndex) == 0) {
            needNodes = IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
        }
        if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
            space = IConstants(constantsAddress).MEDIUM_DIVISOR();
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfFullNodes();
            nodesEnough = INodesData(nodesDataAddress).getNumberOfFreeFullNodes(needNodes);
        } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
            space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfFractionalNodes();
            nodesEnough = INodesData(nodesDataAddress).getNumberOfFreeFractionalNodes(space, needNodes);
        } else if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
            space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
            nodesEnough = numberOfAvailableNodes >= needNodes ? true : false;
        } else if (partOfNode == 0) {
            space = partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
            nodesEnough = numberOfAvailableNodes >= needNodes ? true : false;
        } else {
            revert("Can't set number of nodes. Divisor does not match any valid schain type");
        }
        //Check that schain is not created yet
        require(nodesEnough, "Not enough nodes to create Schain");
    }

    /**
     * @dev setSystemStatus - sets system status
     * @param constantsAddress - address of Constants contract
     */
    /*function setSystemStatus(address constantsAddress) internal {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = 128 * (INodesData(nodesDataAddress).numberOfActiveNodes() + INodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = ISchainsData(dataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes && !(20 * (numberOfSchains - 1) / 17 > numberOfNodes)) {
            IConstants(constantsAddress).setLastTimeOverloaded();
        }
    }*/

    /**
     * @dev coefficientForPrice - calculates a ratio for standart price
     * @param constantsAddress - address of Constants contract
     */
    /*function coefficientForPrice(address constantsAddress) internal view returns (uint up, uint down) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfDays;
        uint numberOfNodes = 128 * (INodesData(nodesDataAddress).numberOfActiveNodes() + INodesData(nodesDataAddress).numberOfLeavingNodes());
        uint numberOfSchains = ISchainsData(dataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes) {
            numberOfDays = (now - IConstants(constantsAddress).lastTimeOverloaded()) / IConstants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(101, numberOfDays, 100);
            down = 100;
        } else if (4 * numberOfSchains / 3 < numberOfNodes) {
            numberOfDays = (now - IConstants(constantsAddress).lastTimeUnderloaded()) / IConstants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(99, numberOfDays, 100);
            down = 100;
        } else {
            up = 1;
            down = 1;
        }
    }*/



    /**
     * @dev binstep - exponentiation by squaring by modulo (a^step)
     * @param a - number which should be exponentiated
     * @param step - exponent
     * @param div - divider of a
     * @return x - result (a^step)
    */
    /*function binstep(uint a, uint step, uint div) internal pure returns (uint x) {
        x = a;
        step -= 1;
        while (step > 0) {
            if (step % 2 == 1) {
                x = mult(x, a, div);
            }
            a = mult(a, a, div);
            step /= 2;
        }
    }*/

    /*function mult(uint a, uint b, uint div) internal pure returns (uint) {
        return (a * b) / div;
    }*/


    /*function getBytesParameter(uint nodeIndex) public view returns (bytes16 bytesParameter) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        bytes4 ip = INodesData(nodesDataAddress).getNodeIP(nodeIndex);
        bytes memory tempData = new bytes(16);
        bytes10 bytesOfIndex = bytes10(nodeIndex);
        bytes2 bytesOfPort = bytes2(INodesData(nodesDataAddress).getNodePort(nodeIndex));
        assembly {
            mstore(add(tempData, 32), bytesOfIndex)
            mstore(add(tempData, 42), ip)
            mstore(add(tempData, 46), bytesOfPort)
            bytesParameter := mload(add(tempData, 32))
        }
    }*/
}
