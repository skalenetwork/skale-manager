pragma solidity ^0.5.0;

import "./GroupsFunctionality.sol";

interface INodesData {
    function nodesLink(uint nodeIndex) external view returns (uint, bool);
    function nodesFull(uint indexOfNode) external view returns (uint, uint);
    function nodesFractional(uint indexOfNode) external view returns (uint, uint);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function removeSpaceFromFractionalNode(uint subarrayLink, uint space) external returns (bool);
    function removeSpaceFromFullNode(uint subarrayLink, uint space) external returns (bool);
    function addSpaceToFractionalNode(uint subarrayLink, uint space) external;
    function addSpaceToFullNode(uint subarrayLink, uint space) external;
    function getNumberOfFractionalNodes() external view returns (uint);
    function getNumberOfFullNodes() external view returns (uint);
    function getNumberOfFreeFullNodes() external view returns (uint);
    function getNumberOfFreeFractionalNodes(uint space) external view returns (uint);
    function getNumberOfNodes() external view returns (uint);
    function numberOfActiveNodes() external view returns (uint);
    function numberOfLeavingNodes() external view returns (uint);
    function fullNodes(uint indexOfNode) external view returns (uint, uint);
    function fractionalNodes(uint indexOfNode) external view returns (uint, uint);
    function getNodeIP(uint nodeIndex) external view returns (bytes4);
    function getNodePort(uint nodeIndex) external view returns (uint16);
}

interface ISchainsData {
    function addSchainForNode(uint nodeIndex, bytes32 schainId) external;
    function setSchainPartOfNode(bytes32 schainId, uint partOfNode) external;
    function getLengthOfSchainsForNode(uint nodeIndex) external view returns (uint);
    function schainsForNodes(uint nodeIndex, uint indexOfSchain) external view returns (bytes32);
    function sumOfSchainsResources() external view returns (uint);
}

interface IConstants {
    function SECONDS_TO_DAY() external view returns (uint32);
    function MEDIUM_DIVISOR() external view returns (uint);
    function TINY_DIVISOR() external view returns (uint);
    function SMALL_DIVISOR() external view returns (uint);
    function MEDIUM_TEST_DIVISOR() external view returns (uint);
    function NUMBER_OF_NODES_FOR_SCHAIN() external view returns (uint);
    function NUMBER_OF_NODES_FOR_TEST_SCHAIN() external view returns (uint);
    function NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN() external view returns (uint);
    function lastTimeUnderloaded() external view returns (uint);
    function lastTimeOverloaded() external view returns (uint);
    function setLastTimeOverloaded() external;
}


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality1 is GroupsFunctionality {
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
     * @dev addSpace - return occupied space to Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param partOfNode - divisor of given type of Schain
     */
    function addSpace(uint nodeIndex, uint partOfNode) public allow(executorName) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint subarrayLink;
        bool isNodeFull;
        (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(nodeIndex);
        // adds space
        if (isNodeFull) {
            if (partOfNode != 0) {
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
        uint8 iterations;
        uint index;
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
        require(iterations < 200, "Schain is not created? try it later");
        // remove Nodes from exception array
        for (uint i = 0; i < nodesInGroup.length; i++) {
            IGroupsData(dataAddress).removeExceptionNode(groupIndex, nodesInGroup[i]);
        }
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
        uint freeSpace;
        uint nodeIndex;
        // get nodeIndex and free space of this Node
        if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
            (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fullNodes(indexOfNode);
        } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
            (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fractionalNodes(indexOfNode);
        } else if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
            bool isNodeFull;
            uint subarrayLink;
            (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(indexOfNode);
            if (isNodeFull) {
                (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fullNodes(subarrayLink);
            } else {
                (nodeIndex, freeSpace) = INodesData(nodesDataAddress).fractionalNodes(subarrayLink);
            }
        } else {
            nodeIndex = indexOfNode;
        }
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
        uint numberOfAvailableNodes;
        if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
            space = IConstants(constantsAddress).MEDIUM_DIVISOR();
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfFullNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).getNumberOfFreeFullNodes();
        } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
            space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfFractionalNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).getNumberOfFreeFractionalNodes(space);
        } else if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
            space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
        } else if (partOfNode == 0) {
            space = partOfNode;
            numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
            numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
        }
        require(IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex) <= numberOfAvailableNodes, "Not enough nodes to create Schain");
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
