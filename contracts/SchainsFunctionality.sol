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

pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/ISchainsFunctionalityInternal.sol";
import "./SchainsData.sol";
import "./SchainsFunctionalityInternal.sol";
import "./ConstantsHolder.sol";



/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality is Permissions, ISchainsFunctionality {
    using StringUtils for string;
    using StringUtils for uint;

    struct SchainParameters {
        uint lifetime;
        uint8 typeOfSchain;
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

    string private _executorName;
    string private _dataName;

    /**
     * @dev addSchain - create Schain in the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param deposit - received amoung of SKL
     * @param data - Schain's data
     */
    function addSchain(address from, uint deposit, bytes calldata data) external override allow(_executorName) {
        uint numberOfNodes;
        uint8 partOfNode;

        address schainsFunctionalityInternalAddress = _contractManager.getContract("SchainsFunctionalityInternal");

        SchainParameters memory schainParameters = _fallbackSchainParametersDataConverter(data);

        require(schainParameters.typeOfSchain <= 5, "Invalid type of Schain");
        require(
            getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime) <= deposit,
            "Not enough money to create Schain");

        //initialize Schain
        _initializeSchainInSchainsData(
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
            schainParameters.name,
            from,
            partOfNode,
            schainParameters.lifetime,
            numberOfNodes,
            deposit,
            schainParameters.nonce,
            keccak256(abi.encodePacked(schainParameters.name)),
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev deleteSchain - removes Schain from the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param name - Schain name
     */
    function deleteSchain(address from, string calldata name) external override allow(_executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = _contractManager.getContract(_dataName);
        require(SchainsData(dataAddress).isOwnerAddress(from, schainId), "Message sender is not an owner of Schain");
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal"));
        address nodesAddress = _contractManager.getContract("Nodes");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = schainsFunctionalityInternal.findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            schainsFunctionalityInternal.removeNodeFromSchain(nodesInGroup[i], schainId);
            schainsFunctionalityInternal.removeNodeFromExceptions(schainId, nodesInGroup[i]);
            if (!Nodes(nodesAddress).isNodeLeft(nodesInGroup[i])) {
                _addSpace(nodesInGroup[i], partOfNode);
            }
        }
        schainsFunctionalityInternal.deleteGroup(schainId);
        SchainsData(dataAddress).removeSchain(schainId, from);
        SchainsData(dataAddress).removeRotation(schainId);
        emit SchainDeleted(from, name, schainId);
    }

    function deleteSchainByRoot(string calldata name) external override allow(_executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = _contractManager.getContract(_dataName);
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal"));
        require(SchainsData(dataAddress).isSchainExist(schainId), "Schain does not exist");

        // removes Schain from Nodes
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        uint8 partOfNode = SchainsData(dataAddress).getSchainsPartOfNode(schainId);
        for (uint i = 0; i < nodesInGroup.length; i++) {
            uint schainIndex = schainsFunctionalityInternal.findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
            require(
                schainIndex < SchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");
            schainsFunctionalityInternal.removeNodeFromSchain(nodesInGroup[i], schainId);
            schainsFunctionalityInternal.removeNodeFromExceptions(schainId, nodesInGroup[i]);
            _addSpace(nodesInGroup[i], partOfNode);
        }
        schainsFunctionalityInternal.deleteGroup(schainId);
        address from = SchainsData(dataAddress).getSchainOwner(schainId);
        SchainsData(dataAddress).removeSchain(schainId, from);
        SchainsData(dataAddress).removeRotation(schainId);
        emit SchainDeleted(from, name, schainId);
    }

    function exitFromSchain(uint nodeIndex) external override allow(_executorName) returns (bool) {
        SchainsData schainsData = SchainsData(_contractManager.getContract(_dataName));
        bytes32 schainId = schainsData.getActiveSchain(nodeIndex);
        require(this.checkRotation(schainId), "No any free Nodes for rotating");
        uint newNodeIndex = this.rotateNode(nodeIndex, schainId);
        schainsData.finishRotation(schainId, nodeIndex, newNodeIndex);
        return schainsData.getActiveSchain(nodeIndex) == bytes32(0) ? true : false;
    }

    function rotateNode(
        uint nodeIndex,
        bytes32 schainId)
    external override allowTwo("SkaleDKG", "SchainsFunctionality") returns (uint)
    {
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal"));
        schainsFunctionalityInternal.removeNodeFromSchain(nodeIndex, schainId);
        return schainsFunctionalityInternal.selectNodeToGroup(schainId);
    }

    function freezeSchains(uint nodeIndex) external allow(_executorName) {
        SchainsData schainsData = SchainsData(_contractManager.getContract("SchainsData"));
        bytes32[] memory schains = schainsData.getActiveSchains(nodeIndex);
        for (uint i = 0; i < schains.length; i++) {
            SchainsData.Rotation memory rotation = schainsData.getRotation(schains[i]);
            if (rotation.nodeIndex == nodeIndex && now < rotation.freezeUntil) {
                continue;
            }
            string memory schainName = schainsData.getSchainName(schains[i]);
            string memory revertMessage = "Node cannot rotate on Schain ";
            revertMessage = revertMessage.strConcat(schainName);
            revertMessage = revertMessage.strConcat(", occupied by Node ");
            revertMessage = revertMessage.strConcat(rotation.nodeIndex.uint2str());
            string memory dkgRevert = "DKG proccess did not finish on schain ";
            require(
                !schainsData.isGroupFailedDKG(keccak256(abi.encodePacked(schainName))),
                dkgRevert.strConcat(schainName));
            require(rotation.freezeUntil < now, revertMessage);
            schainsData.startRotation(schains[i], nodeIndex);
        }
    }

    function restartSchainCreation(string calldata name) external allow(_executorName) {
        bytes32 schainId = keccak256(abi.encodePacked(name));
        address dataAddress = _contractManager.getContract(_dataName);
        require(SchainsData(dataAddress).isGroupFailedDKG(schainId), "DKG success");
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal"));
        require(schainsFunctionalityInternal.isAnyFreeNode(schainId), "No any free Nodes for rotation");
        uint newNodeIndex = schainsFunctionalityInternal.selectNodeToGroup(schainId);
        emit NodeAdded(schainId, newNodeIndex);

    }

    function checkRotation(bytes32 schainId ) external view returns (bool) {
        SchainsData schainsData = SchainsData(_contractManager.getContract(_dataName));
        require(schainsData.isSchainExist(schainId), "Schain does not exist");
        SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            _contractManager.getContract("SchainsFunctionalityInternal"));
        return schainsFunctionalityInternal.isAnyFreeNode(schainId);
    }

    function initialize(address newContractsAddress) public override initializer {
        Permissions.initialize(newContractsAddress);
        _executorName = "SkaleManager";
        _dataName = "SchainsData";
    }

    /**
     * @dev getSchainPrice - returns current price for given Schain
     * @param typeOfSchain - type of Schain
     * @param lifetime - lifetime of Schain
     * @return current price for given Schain
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {
        ConstantsHolder constantsHolder = ConstantsHolder(_contractManager.getContract("ConstantsHolder"));
        address schainsFunctionalityInternalAddress = _contractManager.getContract("SchainsFunctionalityInternal");
        uint nodeDeposit = constantsHolder.NODE_DEPOSIT();
        uint numberOfNodes;
        uint8 divisor;
        (numberOfNodes, divisor) = ISchainsFunctionalityInternal(
            schainsFunctionalityInternalAddress
        ).getNodesDataFromTypeOfSchain(typeOfSchain);
        if (divisor == 0) {
            return 1e18;
        } else {
            uint up = nodeDeposit.mul(numberOfNodes.mul(lifetime.mul(2)));
            uint down = uint(
                uint(constantsHolder.TINY_DIVISOR())
                    .div(divisor)
                    .mul(uint(constantsHolder.SECONDS_TO_YEAR())));
            return up.div(down);
        }
    }

    function _initializeSchainInSchainsData(
        string memory name,
        address from,
        uint deposit,
        uint lifetime) internal
    {
        address dataAddress = _contractManager.getContract(_dataName);
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
     * @return schainParameters Parsed lifetime, typeOfSchain, nonce and name
     */
    function _fallbackSchainParametersDataConverter(bytes memory data)
        internal
        pure
        returns (SchainParameters memory schainParameters)
    {
        (schainParameters.lifetime,
        schainParameters.typeOfSchain,
        schainParameters.nonce,
        schainParameters.name) = abi.decode(data, (uint, uint8, uint16, string));
    }

    /**
     * @dev _addSpace - return occupied space to Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param partOfNode - divisor of given type of Schain
     */
    function _addSpace(uint nodeIndex, uint8 partOfNode) internal {
        Nodes nodes = Nodes(_contractManager.getContract("Nodes"));
        nodes.addSpaceToNode(nodeIndex, partOfNode);
    }
}
