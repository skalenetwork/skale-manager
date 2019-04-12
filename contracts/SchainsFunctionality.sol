pragma solidity ^0.4.24;

import './GroupsFunctionality.sol';

interface NodesData {
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

interface SchainsData {
    function initializeSchain(string name, address from, uint lifetime, uint deposit) external;
    function setSchainIndex(bytes32 schainId, address from) external;
    function addSchainForNode(uint nodeIndex, bytes32 schainId) external;
    function setSchainPartOfNode(bytes32 schainId, uint partOfNode) external;
    function removeSchain(bytes32 schainId, address from) external;
    function removeSchainForNode(uint nodeIndex, uint schainIndex) external;
    function isTimeExpired(bytes32 schainId) external view returns (bool);
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool);
    function isSchainNameAvailable(string name) external view returns (bool);
    function getSchainsPartOfNode(bytes32 schainId) external view returns (uint);
    function getLengthOfSchainsForNode(uint nodeIndex) external view returns (uint);
    function schainsForNodes(uint nodeIndex, uint indexOfSchain) external view returns (bytes32);
    function sumOfSchainsResources() external view returns (uint);
}

interface Constants {
    function NODE_DEPOSIT() external view returns (uint);
    function SECONDS_TO_DAY() external view returns (uint32);
    function SECONDS_TO_YEAR() external view returns (uint32);
    function MEDIUM_DIVISOR() external view returns (uint);
    function TINY_DIVISOR() external view returns (uint);
    function SMALL_DIVISOR() external view returns (uint);
    function NUMBER_OF_NODES_FOR_SCHAIN() external view returns (uint);
    function NUMBER_OF_NODES_FOR_TEST_SCHAIN() external view returns (uint);
    function lastTimeUnderloaded() external view returns (uint);
    function lastTimeOverloaded() external view returns (uint);
    function setLastTimeOverloaded() external;
}


contract SchainsFunctionality is GroupsFunctionality {
    
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

    event SchainNodes(
        string name,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    event WithdrawFromSchain(
        string name,
        address owner,
        uint deposit,
        bytes32 groupIndex,
        uint32 time,
        uint gasSpend
    );

    constructor(string newExecutorName, string newDataName, address newContractsAddress) GroupsFunctionality(newExecutorName, newDataName, newContractsAddress) public {
        
    }

    function addSchain(address from, uint deposit, bytes data) public allow(executorName) {
        uint lifetime;
        uint numberOfNodes;
        uint typeOfSchain;
        uint16 nonce;
        string memory name;
        uint partOfNode;
        (lifetime, typeOfSchain, nonce, name) = fallbackSchainParametersDataConverter(data);
        require(getSchainPrice(typeOfSchain, lifetime) <= deposit, "Not enough money to create Schain");
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(SchainsData(dataAddress).isSchainNameAvailable(name), "Schain name is not available");
        require(typeOfSchain <= 4, "Invalid type of Schain");
        SchainsData(dataAddress).initializeSchain(name, from, lifetime, deposit);
        //bytes32 schainId = keccak256(abi.encodePacked(name));
        SchainsData(dataAddress).setSchainIndex(keccak256(abi.encodePacked(name)), from);
        (numberOfNodes, partOfNode) = getNodesDataFromTypeOfSchain(typeOfSchain);
        createGroupForSchain(name, keccak256(abi.encodePacked(name)), numberOfNodes, partOfNode, dataAddress);
        emit SchainCreated(name, from, partOfNode, lifetime, numberOfNodes, deposit, nonce, keccak256(abi.encodePacked(name)), uint32(block.timestamp), gasleft());
    }

    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint nodeDeposit = Constants(constantsAddress).NODE_DEPOSIT();
        uint numberOfNodes;
        uint divisor;
        (numberOfNodes, divisor) = getNodesDataFromTypeOfSchain(typeOfSchain);
        /*uint up;
        uint down;
        (up, down) = coefficientForPrice(constantsAddress);*/
        if (divisor == 0) {
            return 1000000000000000000;
        } else {
            return (nodeDeposit * numberOfNodes * 2 * lifetime) / (divisor * Constants(constantsAddress).SECONDS_TO_YEAR());
        }
    }

    /*function getSchainNodes(string schainName) public view returns (bytes16[] memory schainNodes) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        bytes32 schainId = keccak256(abi.encodePacked(schainName));
        uint[] memory nodesInGroup = GroupsData(dataAddress).getNodesInGroup(schainId);
        schainNodes = new bytes16[](nodesInGroup.length);
        for (uint indexOfNodes = 0; indexOfNodes < nodesInGroup.length; indexOfNodes++) {
            schainNodes[indexOfNodes] = getBytesParameter(nodesInGroup[indexOfNodes]);
        }
    }*/

    function deleteSchain(address from, bytes32 schainId) public allow(executorName) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        //require(SchainsData(dataAddress).isTimeExpired(schainId), "Schain lifetime did not end");
        require(SchainsData(dataAddress).isOwnerAddress(from, schainId), "Message sender is not an owner of Schain");
        uint[] memory nodesInGroup = GroupsData(dataAddress).getNodesInGroup(schainId);
        uint partOfNode = SchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = find(nodesInGroup[i], schainId);
            require(schainIndex < SchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]), "Some Node does not contain given Schain");
            SchainsData(dataAddress).removeSchainForNode(nodesInGroup[i], schainIndex);
            addSpace(nodesInGroup[i], partOfNode);
        }
        deleteGroup(schainId);
        SchainsData(dataAddress).removeSchain(schainId, from);
    }

    function generateGroup(bytes32 groupIndex) internal returns (uint[] nodesInGroup) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(GroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");
        bytes32 groupData = GroupsData(dataAddress).getGroupData(groupIndex);
        uint hash = uint(keccak256(abi.encodePacked(uint(blockhash(block.number)), groupIndex)));
        uint numberOfNodes;
        uint space;
        //uint recommendedNumberOfNodes = GroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
        (numberOfNodes, space) = setNumberOfNodesInGroup(groupIndex, uint(groupData), dataAddress);
        uint indexOfNode;
        uint nodeIndex;
        uint8 iterations;
        uint index;
        nodesInGroup = new uint[](GroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex));
        while (index < GroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex) && iterations < 200) {
            indexOfNode = hash % numberOfNodes;
            nodeIndex = returnValidNodeIndex(uint(groupData), indexOfNode);
            if (comparator(indexOfNode, uint(groupData), space) && !GroupsData(dataAddress).isExceptionNode(groupIndex, nodeIndex)) {
                GroupsData(dataAddress).setException(groupIndex, nodeIndex);
                nodesInGroup[index] = nodeIndex;
                SchainsData(dataAddress).addSchainForNode(nodeIndex, groupIndex);
                require(removeSpace(nodeIndex, space), "Could not remove space from Node");
                index++;
            }
            hash = uint(keccak256(abi.encodePacked(hash, indexOfNode)));
            iterations++;
        }
        require(iterations < 200, "Schain is not created? try it later");
        for (uint i = 0; i < nodesInGroup.length; i++) {
            GroupsData(dataAddress).removeExceptionNode(groupIndex, nodesInGroup[i]);
        }
        GroupsData(dataAddress).setNodesInGroup(groupIndex, nodesInGroup);
        emit GroupGenerated(groupIndex, nodesInGroup, uint32(block.timestamp), gasleft());
    }

    function comparator(uint indexOfNode, uint partOfNode, uint space) internal view returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint freeSpace;
        uint nodeIndex;
        if (partOfNode == Constants(constantsAddress).MEDIUM_DIVISOR()) {
            (nodeIndex, freeSpace) = NodesData(nodesDataAddress).fullNodes(indexOfNode);
        } else if (partOfNode == Constants(constantsAddress).TINY_DIVISOR() || partOfNode == Constants(constantsAddress).SMALL_DIVISOR()) {
            (nodeIndex, freeSpace) = NodesData(nodesDataAddress).fractionalNodes(indexOfNode);
        } else {
            nodeIndex = indexOfNode;
        }
        return NodesData(nodesDataAddress).isNodeActive(nodeIndex) && (freeSpace >= space);
    }

    function returnValidNodeIndex(uint partOfNode, uint indexOfNode) internal view returns (uint nodeIndex) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint space;
        if (partOfNode == Constants(constantsAddress).MEDIUM_DIVISOR()) {
            (nodeIndex, space) = NodesData(nodesDataAddress).fullNodes(indexOfNode);
        } else if (partOfNode == Constants(constantsAddress).TINY_DIVISOR() || partOfNode == Constants(constantsAddress).SMALL_DIVISOR()) {
            (nodeIndex, space) = NodesData(nodesDataAddress).fractionalNodes(indexOfNode);
        } else {
            return indexOfNode;
        }
    }

    function removeSpace(uint nodeIndex, uint space) internal returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint subarrayLink;
        bool isNodeFull;
        (subarrayLink, isNodeFull) = NodesData(nodesDataAddress).nodesLink(nodeIndex);
        if (isNodeFull) {
            return NodesData(nodesDataAddress).removeSpaceFromFullNode(subarrayLink, space);
        } else {
            return NodesData(nodesDataAddress).removeSpaceFromFractionalNode(subarrayLink, space);
        }
    }

    function addSpace(uint nodeIndex, uint partOfNode) internal {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint subarrayLink;
        bool isNodeFull;
        (subarrayLink, isNodeFull) = NodesData(nodesDataAddress).nodesLink(nodeIndex);
        if (isNodeFull) {
            if (partOfNode != 0) {
                NodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, Constants(constantsAddress).MEDIUM_DIVISOR() / partOfNode);
            } else {
                NodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, partOfNode);
            }
        } else {
            if (partOfNode != 0) {
                NodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, Constants(constantsAddress).TINY_DIVISOR() / partOfNode);
            } else {
                NodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, partOfNode);
            }
        }
    }
    
    function setNumberOfNodesInGroup(bytes32 groupIndex, uint partOfNode, address dataAddress) internal view returns (uint numberOfNodes, uint space) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint numberOfAvailableNodes;
        if (partOfNode == Constants(constantsAddress).MEDIUM_DIVISOR()) {
            space = Constants(constantsAddress).MEDIUM_DIVISOR() / partOfNode;
            numberOfNodes = NodesData(nodesDataAddress).getNumberOfFullNodes();
            numberOfAvailableNodes = NodesData(nodesDataAddress).getNumberOfFreeFullNodes();
        } else if (partOfNode == Constants(constantsAddress).TINY_DIVISOR() || partOfNode == Constants(constantsAddress).SMALL_DIVISOR()) {
            space = Constants(constantsAddress).TINY_DIVISOR() / partOfNode;
            numberOfNodes = NodesData(nodesDataAddress).getNumberOfFractionalNodes();
            numberOfAvailableNodes = NodesData(nodesDataAddress).getNumberOfFreeFractionalNodes(space);
        } else if (partOfNode == 0) {
            space = partOfNode;
            numberOfNodes = NodesData(nodesDataAddress).getNumberOfNodes();
            numberOfAvailableNodes = NodesData(nodesDataAddress).numberOfActiveNodes();
        }
        require(GroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex) <= numberOfAvailableNodes, "Not enough nodes to create Schain");
    }

    function createGroupForSchain(string schainName, bytes32 schainId, uint numberOfNodes, uint partOfNode, address dataAddress) internal {
        addGroup(schainId, numberOfNodes, bytes32(partOfNode));
        uint[] memory numberOfNodesInGroup = generateGroup(schainId);
        SchainsData(dataAddress).setSchainPartOfNode(schainId, partOfNode);
        emit SchainNodes(schainName, schainId, numberOfNodesInGroup, uint32(block.timestamp), gasleft());
    }

    function getNodesDataFromTypeOfSchain(uint typeOfSchain) internal view returns (uint numberOfNodes, uint partOfNode) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        numberOfNodes = Constants(constantsAddress).NUMBER_OF_NODES_FOR_SCHAIN();
        if (typeOfSchain == 1) {
            partOfNode = Constants(constantsAddress).TINY_DIVISOR();
        } else if (typeOfSchain == 2) {
            partOfNode = Constants(constantsAddress).SMALL_DIVISOR();
        } else if (typeOfSchain == 3) {
            partOfNode = Constants(constantsAddress).MEDIUM_DIVISOR();
        } else if (typeOfSchain == 4) {
            partOfNode = 0;
            numberOfNodes = Constants(constantsAddress).NUMBER_OF_NODES_FOR_TEST_SCHAIN();
        }
    }

    /*function setSystemStatus(address constantsAddress) internal {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfNodes = 128 * (NodesData(nodesDataAddress).numberOfActiveNodes() + NodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = SchainsData(dataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes && !(20 * (numberOfSchains - 1) / 17 > numberOfNodes)) {
            Constants(constantsAddress).setLastTimeOverloaded();
        }
    }*/

    /*function coefficientForPrice(address constantsAddress) internal view returns (uint up, uint down) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        uint numberOfDays;
        uint numberOfNodes = 128 * (NodesData(nodesDataAddress).numberOfActiveNodes() + NodesData(nodesDataAddress).numberOfLeavingNodes());
        uint numberOfSchains = SchainsData(dataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes) {
            numberOfDays = (now - Constants(constantsAddress).lastTimeOverloaded()) / Constants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(101, numberOfDays, 100);
            down = 100;
        } else if (4 * numberOfSchains / 3 < numberOfNodes) {
            numberOfDays = (now - Constants(constantsAddress).lastTimeUnderloaded()) / Constants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(99, numberOfDays, 100);
            down = 100;
        } else {
            up = 1;
            down = 1;
        }
    }*/

    function find(uint nodeIndex, bytes32 schainId) internal view returns (uint) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        uint length = SchainsData(dataAddress).getLengthOfSchainsForNode(nodeIndex);
        for (uint i = 0; i < length; i++) {
            if (SchainsData(dataAddress).schainsForNodes(nodeIndex, i) == schainId) {
                return i;
            }
        }
        return length;
    }

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
        bytes4 ip = NodesData(nodesDataAddress).getNodeIP(nodeIndex);
        bytes memory tempData = new bytes(16);
        bytes10 bytesOfIndex = bytes10(nodeIndex);
        bytes2 bytesOfPort = bytes2(NodesData(nodesDataAddress).getNodePort(nodeIndex));
        assembly {
            mstore(add(tempData, 32), bytesOfIndex)
            mstore(add(tempData, 42), ip)
            mstore(add(tempData, 46), bytesOfPort)
            bytesParameter := mload(add(tempData, 32))
        }
    }*/

    function fallbackSchainParametersDataConverter(bytes data) internal pure returns (uint lifetime, uint typeOfSchain, uint16 nonce, string name) {
        require(data.length > 36, "Incorrect bytes data config");
        bytes32 lifetimeInBytes;
        bytes1 typeOfSchainInBytes;
        bytes2 nonceInBytes;
        assembly {
            lifetimeInBytes := mload(add(data, 33))
            typeOfSchainInBytes := mload(add(data, 65))
            nonceInBytes := mload(add(data, 66))
        }
        typeOfSchain = uint(typeOfSchainInBytes);
        lifetime = uint(lifetimeInBytes);
        nonce = uint16(nonceInBytes);
        name = new string(data.length - 36);
        for (uint i = 0; i < bytes(name).length; ++i) {
            bytes(name)[i] = data[36 + i];
        }
    }
}
