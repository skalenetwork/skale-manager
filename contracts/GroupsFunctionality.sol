pragma solidity ^0.5.0;

import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";

/**
 * @title SkaleVerifier - interface of SkaleVerifier
 */
interface ISkaleVerifier {
    function verify(
        uint sigx,
        uint sigy,
        uint hashx,
        uint hashy,
        uint pkx1,
        uint pky1,
        uint pkx2,
        uint pky2) external view returns (bool);
}


/**
 * @title GroupsFunctionality - contract with some Groups functionality, will be inherited by
 * ValidatorsFunctionality and SchainsFunctionality
 */
contract GroupsFunctionality is Permissions {

    // informs that Group is added
    event GroupAdded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    // informs that an exception set in Group
    event ExceptionSet(
        bytes32 groupIndex,
        uint exceptionNodeIndex,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is deleted
    event GroupDeleted(
        bytes32 groupIndex,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is upgraded
    event GroupUpgraded(
        bytes32 groupIndex,
        bytes32 groupData,
        uint32 time,
        uint gasSpend
    );

    // informs that Group is generated
    event GroupGenerated(
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    // name of executor contract
    string executorName;
    // name of data contract
    string dataName;

    /**
     * @dev contructor in Permissions approach
     * @param newExecutorName - name of executor contract
     * @param newDataName - name of data contract
     * @param newContractsAddress needed in Permissions constructor
     */
    constructor(string memory newExecutorName, string memory newDataName, address newContractsAddress) Permissions(newContractsAddress) public {
        executorName = newExecutorName;
        dataName = newDataName;
    }

    /**
     * @dev addGroup - creates and adds new Group to Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function addGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        IGroupsData(groupsDataAddress).addGroup(groupIndex, newRecommendedNumberOfNodes, data);
        emit GroupAdded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev deleteGroup - delete Group from Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function deleteGroup(bytes32 groupIndex) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(IGroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");
        IGroupsData(groupsDataAddress).removeGroup(groupIndex);
        IGroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
        emit GroupDeleted(groupIndex, uint32(block.timestamp), gasleft());
    }

    /**
     * @dev upgradeGroup - upgrade Group at Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function upgradeGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        require(IGroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");
        IGroupsData(groupsDataAddress).setNewGroupData(groupIndex, data);
        IGroupsData(groupsDataAddress).setNewAmountOfNodes(groupIndex, newRecommendedNumberOfNodes);
        IGroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
        emit GroupUpgraded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev verifySignature - verify signature which create Group by Groups BLS master public key
     * @param groupIndex - Groups identifier
     * @param signatureX - first part of BLS signature
     * @param signatureY - second part of BLS signature
     * @param hashX - first part of hashed message
     * @param hashY - second part of hashed message
     * @return true - if correct, false - if not
     */
    function verifySignature(
        bytes32 groupIndex,
        uint signatureX,
        uint signatureY,
        uint hashX,
        uint hashY) public view returns (bool)
    {
        address groupsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked(dataName)));
        uint publicKeyx1;
        uint publicKeyy1;
        uint publicKeyx2;
        uint publicKeyy2;
        (publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2) = IGroupsData(groupsDataAddress).getGroupsPublicKey(groupIndex);
        address skaleVerifierAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SkaleVerifier")));
        return ISkaleVerifier(skaleVerifierAddress).verify(
            signatureX, signatureY, hashX, hashY, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2
        );
    }

    /**
     * @dev generateGroup - abstract method which would be implemented in inherited contracts
     * function generates group of Nodes
     * @param groupIndex - Groups identifier
     * return array of indexes of Nodes in Group
     */
    function generateGroup(bytes32 groupIndex) internal returns (uint[] memory);
}
