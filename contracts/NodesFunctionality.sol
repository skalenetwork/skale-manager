pragma solidity ^0.4.24;

import './Permissions.sol';

interface Constants {
    function NODE_DEPOSIT() external view returns (uint);
    function FRACTIONAL_FACTOR() external view returns (uint);
    function FULL_FACTOR() external view returns (uint);
    function SECONDS_TO_DAY() external view returns (uint32);
    function lastTimeUnderloaded() external view returns (uint);
    function lastTimeOverloaded() external view returns (uint);
    function setLastTimeUnderloaded() external;
}

interface NodesData {
    function nodesIPCheck(bytes4 ip) external view returns (bool);
    function nodesNameCheck(bytes32 name) external view returns (bool);
    function nodesLink(uint nodeIndex) external view returns (uint, bool);
    function getNumberOfFractionalNodes() external view returns (uint);
    function getNumberOfFullNodes() external view returns (uint);
    function isNodeExist(address from, uint nodeIndex) external view returns (bool);
    function isNodeActive(uint nodeIndex) external view returns (bool);
    function isNodeLeaving(uint nodeIndex) external view returns (bool);
    function isLeavingPeriodExpired(uint nodeIndex) external view returns (bool);
    function addNode(address from, string name, bytes4 ip, bytes4 publicIP, uint16 port, bytes publicKey) external returns (uint);
    function addFractionalNode(uint nodeIndex) external;
    function addFullNode(uint nodeIndex) external;
    function setNodeLeaving(uint nodeIndex) external;
    function setNodeLeft(uint nodeIndex) external;
    function removeFractionalNode(uint subarrayLink) external;
    function removeFullNode(uint subarrayLink) external;
    function numberOfActiveNodes() external view returns (uint);
    function numberOfLeavingNodes() external view returns (uint);
}

interface SchainsData {
    function sumOfSchainsResources() external view returns (uint);
}


contract NodesFunctionality is Permissions {

    event NodeCreated(
        uint nodeIndex,
        address owner,
        string name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        uint16 nonce,
        uint32 time,
        uint gasSpend
    );

    event WithdrawDepositFromNodeComplete(
        uint nodeIndex,
        address owner,
        uint deposit,
        uint32 time,
        uint gasSpend
    );

    event WithdrawDepositFromNodeInit(
        uint nodeIndex,
        address owner,
        uint32 startLeavingPeriod,
        uint32 time,
        uint gasSpend
    );

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {
    
    }

    function createNode(address from, uint value, bytes data) public allow("SkaleManager") returns (uint nodeIndex) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        require(value >= Constants(constantsAddress).NODE_DEPOSIT(), "Not enough money to create Node");
        uint16 nonce;
        bytes4 ip;
        bytes4 publicIP;
        uint16 port;
        string memory name;
        bytes memory publicKey;
        (port, nonce, ip, publicIP) = fallbackDataConverter(data);
        (publicKey, name) = fallbackDataConverterPublicKeyAndName(data);
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(ip != 0x0 && !NodesData(nodesDataAddress).nodesIPCheck(ip), "IP address is zero or is not available");
        require(!NodesData(nodesDataAddress).nodesNameCheck(keccak256(abi.encodePacked(name))), "Name has already registered");
        require(port > 0, "Port is zero");
        nodeIndex = NodesData(nodesDataAddress).addNode(from, name, ip, publicIP, port, publicKey);
        setNodeType(nodesDataAddress, constantsAddress, nodeIndex);
        //setSystemStatus(constantsAddress);
        emit NodeCreated(nodeIndex, from, name, ip, publicIP, port, nonce, uint32(block.timestamp), gasleft());
    }

    function removeNode(address from, uint nodeIndex) public allow("SkaleManager") {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(NodesData(nodesDataAddress).isNodeExist(from, nodeIndex), "Node does not exist for message sender");
        require(NodesData(nodesDataAddress).isNodeActive(nodeIndex), "Node is not Active");
        NodesData(nodesDataAddress).setNodeLeft(nodeIndex);
        bool isNodeFull;
        uint subarrayLink;
        (subarrayLink, isNodeFull) = NodesData(nodesDataAddress).nodesLink(nodeIndex);
        if (isNodeFull) {
            NodesData(nodesDataAddress).removeFullNode(subarrayLink);
        } else {
            NodesData(nodesDataAddress).removeFractionalNode(subarrayLink);
        }
    }

    function initWithdrawDeposit(address from, uint nodeIndex) public allow("SkaleManager") returns (bool) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(NodesData(nodesDataAddress).isNodeExist(from, nodeIndex), "Node does not exist for message sender");
        require(NodesData(nodesDataAddress).isNodeActive(nodeIndex), "Node is not Active");
        NodesData(nodesDataAddress).setNodeLeaving(nodeIndex);
        emit WithdrawDepositFromNodeInit(nodeIndex, from, uint32(block.timestamp), uint32(block.timestamp), gasleft());
        return true;
    }

    function completeWithdrawDeposit(address from, uint nodeIndex) public allow("SkaleManager") returns (uint) {
        address nodesDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        require(NodesData(nodesDataAddress).isNodeExist(from, nodeIndex), "Node does not exist for message sender");
        require(NodesData(nodesDataAddress).isNodeLeaving(nodeIndex), "Node is no Leaving");
        require(NodesData(nodesDataAddress).isLeavingPeriodExpired(nodeIndex), "Leaving period is not expired");
        NodesData(nodesDataAddress).setNodeLeft(nodeIndex);
        bool isNodeFull;
        uint subarrayLink;
        (subarrayLink, isNodeFull) = NodesData(nodesDataAddress).nodesLink(nodeIndex);
        if (isNodeFull) {
            NodesData(nodesDataAddress).removeFullNode(subarrayLink);
        } else {
            NodesData(nodesDataAddress).removeFractionalNode(subarrayLink);
        }
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        emit WithdrawDepositFromNodeComplete(nodeIndex, from, Constants(constantsAddress).NODE_DEPOSIT(), uint32(block.timestamp), gasleft());
        return Constants(constantsAddress).NODE_DEPOSIT();
    }

    /*function getNodePrice() public view returns (uint) {
        address constantsAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("Constants")));
        uint nodeDeposit = Constants(constantsAddress).NODE_DEPOSIT();
        uint up;
        uint down;
        (up, down) = coefficientForPrice(constantsAddress);
        return (nodeDeposit * up) / down;
    }*/

    function setNodeType(address nodesDataAddress, address constantsAddress, uint nodeIndex) internal {
        bool isNodeFull = (NodesData(nodesDataAddress).getNumberOfFractionalNodes() * Constants(constantsAddress).FRACTIONAL_FACTOR() > NodesData(nodesDataAddress).getNumberOfFullNodes() * Constants(constantsAddress).FULL_FACTOR());
        if (NodesData(nodesDataAddress).getNumberOfFullNodes() == 0 || isNodeFull) {
            NodesData(nodesDataAddress).addFullNode(nodeIndex);
        } else {
            NodesData(nodesDataAddress).addFractionalNode(nodeIndex);
        }
    }

    /*function setSystemStatus(address constantsAddress) internal {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint numberOfNodes = 128 * (NodesData(dataAddress).numberOfActiveNodes() + NodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = SchainsData(schainsDataAddress).sumOfSchainsResources();
        if (4 * numberOfSchains / 3 < numberOfNodes && !(4 * numberOfSchains / 3 < (numberOfNodes - 1))) {
            Constants(constantsAddress).setLastTimeUnderloaded();
        }
    }*/

    /*function coefficientForPrice(address constantsAddress) internal view returns (uint up, uint down) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint numberOfDays;
        uint numberOfNodes = 128 * (NodesData(dataAddress).numberOfActiveNodes() + NodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = SchainsData(schainsDataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes) {
            numberOfDays = (now - Constants(constantsAddress).lastTimeOverloaded()) / Constants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(99, numberOfDays, 100);
            down = 100;
        } else if (4 * numberOfSchains / 3 < numberOfNodes) {
            numberOfDays = (now - Constants(constantsAddress).lastTimeUnderloaded()) / Constants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(101, numberOfDays, 100);
            down = 100;
        } else {
            up = 1;
            down = 1;
        }
    }*/

    /*function binstep(uint a, uint step, uint div) internal pure returns (uint x) {
        x = div;
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

    function fallbackDataConverter(bytes data) 
        private 
        pure
        returns (uint16, uint16, bytes4, bytes4 /*address secondAddress,*/)
    {
        require(data.length > 77, "Incorrect bytes data config");
        bytes4 ip;
        bytes4 publicIP;
        bytes2 portInBytes;
        bytes2 nonceInBytes;
        assembly {
            portInBytes := mload(add(data, 33)) // 0x21                  
            nonceInBytes := mload(add(data, 35)) // 0x25
            ip := mload(add(data, 37)) // 0x29
            publicIP := mload(add(data, 41))
        }
        return (uint16(portInBytes), uint16(nonceInBytes), ip, publicIP);
    }

    function fallbackDataConverterPublicKeyAndName(bytes data) private pure returns (bytes, string) {
        require(data.length > 77, "Incorrect bytes data config");
        bytes32 firstPartPublicKey;
        bytes32 secondPartPublicKey;
        bytes memory publicKey = new bytes(64);
        assembly {
            firstPartPublicKey := mload(add(data, 45))
            secondPartPublicKey := mload(add(data, 77))
        }
        for (uint i = 0; i < 32; i++) {
            publicKey[i] = firstPartPublicKey[i];
            }
        for (i = 0; i < 32; i++) {
            publicKey[i + 32] = secondPartPublicKey[i];
            }
        string memory name = new string(data.length - 77);
        for (i = 0; i < bytes(name).length; ++i) {
            bytes(name)[i] = data[77 + i];                                                       
        }
        return (publicKey, name);
    }

}
