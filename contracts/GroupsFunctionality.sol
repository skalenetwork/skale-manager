pragma solidity ^0.4.24;

import './Permissions.sol';

interface GroupsData {
    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) external;
    function removeAllNodesInGroup(bytes32 groupIndex) external;
    function setNewAmountOfNodes(bytes32 groupIndex, uint amountOfNodes) external;
    function setNewGroupData(bytes32 groupIndex, bytes32 data) external;
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) external;
    function setNodesInGroup(bytes32 groupIndex, uint[] nodesInGroup) external;
    function removeExceptionNode(bytes32 groupIndex, uint nodeIndex) external;
    function removeGroup(bytes32 groupIndex) external;
    function setException(bytes32 groupIndex, uint nodeIndex) external;
    function isGroupActive(bytes32 groupIndex) external view returns (bool);
    function isExceptionNode(bytes32 groupIndex, uint nodeIndex) external view returns (bool);
    function getGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint);
    function getNodesInGroup(bytes32 schainId) external view returns (uint[] memory);
    function getGroupData(bytes32 groupIndex) external view returns (bytes32);
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view returns (uint);
    function getNumberOfNodesInGroup(bytes32 groupIndex) external view returns (uint);
}

interface SkaleVerifier {
    function verify(uint sigx, uint sigy, uint hashx, uint hashy, uint pkx1, uint pky1, uint pkx2, uint pky2) external view returns (bool);
}


contract GroupsFunctionality is Permissions {

    event GroupAdded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    event ExceptionSet(
        bytes32 groupIndex,
        uint exceptionNodeIndex,
        uint32 time,
        uint gasSpend
    );

    event GroupDeleted(
        bytes32 groupIndex,
        uint32 time,
        uint gasSpend
    );

    event GroupUpgraded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    event GroupGenerated(
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    string executorName;
    string dataName;

    constructor(string newExecutorName, string newDataName, address newContractsAddress) Permissions(newContractsAddress) public {
        executorName = newExecutorName;
        dataName = newDataName;
    }

    function addGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        GroupsData(groupsDataAddress).addGroup(groupIndex, newRecommendedNumberOfNodes, data);
        emit GroupAdded(groupIndex, data, uint32(block.timestamp), gasleft());
    }

    function deleteGroup(bytes32 groupIndex) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(GroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");
        GroupsData(groupsDataAddress).removeGroup(groupIndex);
        GroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
        emit GroupDeleted(groupIndex, uint32(block.timestamp), gasleft());
    }

    function upgradeGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(GroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");
        GroupsData(groupsDataAddress).setNewGroupData(groupIndex, data);
        GroupsData(groupsDataAddress).setNewAmountOfNodes(groupIndex, newRecommendedNumberOfNodes);
        GroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
        emit GroupUpgraded(groupIndex, data, uint32(block.timestamp), gasleft());
    }

    function verifySignature(bytes32 groupIndex, uint signatureX, uint signatureY, uint hashX, uint hashY) public view returns (bool) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        uint publicKeyx1;
        uint publicKeyy1;
        uint publicKeyx2;
        uint publicKeyy2;
        (publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2) = GroupsData(groupsDataAddress).getGroupsPublicKey(groupIndex);
        address skaleVerifierAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleVerifier")));
        return SkaleVerifier(skaleVerifierAddress).verify(signatureX, signatureY, hashX, hashY, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2);
    }

    function generateGroup(bytes32 groupIndex) internal returns (uint[]);
}
