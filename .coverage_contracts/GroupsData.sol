/*
    GroupsData.sol - SKALE Manager
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
import "./interfaces/IGroupsData.sol";


interface ISkaleDKG {
    function openChannel(bytes32 groupIndex) external;
    function deleteChannel(bytes32 groupIndex) external;
    function isChannelOpened(bytes32 groupIndex) external view returns (bool);
}


/**
 * @title GroupsData - contract with some Groups data, will be inherited by
 * SchainsData and ValidatorsData.
 */
contract GroupsData is IGroupsData, Permissions {
function coverage_0x03b7aa14(bytes32 c__0x03b7aa14) public pure {}


    // struct to note which Node has already joined to the group
    struct GroupCheck {
        mapping (uint => bool) check;
    }

    struct Group {
        bool active;
        bytes32 groupData;
        uint[] nodesInGroup;
        uint recommendedNumberOfNodes;
        // BLS master public key
        uint[4] groupsPublicKey;
        bool succesfulDKG;
    }

    // contain all groups
    mapping (bytes32 => Group) public groups;
    // mapping for checking Has Node already joined to the group
    mapping (bytes32 => GroupCheck) exceptions;

    // name of executor contract
    string executorName;

    /**
     * @dev constructor in Permissions approach
     * @param newExecutorName - name of executor contract
     * @param newContractsAddress needed in Permissions constructor
     */
    constructor(string memory newExecutorName, address newContractsAddress) public Permissions(newContractsAddress) {coverage_0x03b7aa14(0xe2afd6b38ce9ede5581cd535a584a9ff974689b8252f8f0ff719fb862b01d781); /* function */ 

coverage_0x03b7aa14(0xfec469a4cf5f2f49856c21aaaaabe57c45c73e5cdfd4d9c29308fe055da1789d); /* line */ 
        coverage_0x03b7aa14(0x8624667a3b044cb051da8ad7bb8e5d619d8ef40425e04820c11519f99dcbdf55); /* statement */ 
executorName = newExecutorName;
    }

    /**
     * @dev addGroup - creates and adds new Group to mapping
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param amountOfNodes - recommended number of Nodes in this Group
     * @param data - some extra data
     */
    function addGroup(bytes32 groupIndex, uint amountOfNodes, bytes32 data) external allow(executorName) {coverage_0x03b7aa14(0x55fe1eee7c5920b9c20553b2cf3963dd19ccd93f93ca70437124bec556c0496e); /* function */ 

coverage_0x03b7aa14(0x1945825c5b8c87b195a9803f4c31badaf28ec2808900f0f8b3052a5daee2f12c); /* line */ 
        coverage_0x03b7aa14(0xe90267c55ee173b578bcd8bbdfafe768c9bb19864af5044c8c130824e3387145); /* statement */ 
groups[groupIndex].active = true;
coverage_0x03b7aa14(0x4b56fe94b4b643b4fda00969ed51f34bab4bb925c29a2c8287d74d67392e051f); /* line */ 
        coverage_0x03b7aa14(0x2dc367caa24e18ca5558e366e48411f0ac1f0c48c578e4f53a258d3ed3b1e500); /* statement */ 
groups[groupIndex].recommendedNumberOfNodes = amountOfNodes;
coverage_0x03b7aa14(0x482b23d72b6e093b02c1a47e0d4f035e8b4f5ec5b32abb93eb01d3f26b79a940); /* line */ 
        coverage_0x03b7aa14(0x3d9eed84db24800fafc3ba104e9a31f617e126bac73958f0bc1db04f907fb80f); /* statement */ 
groups[groupIndex].groupData = data;
        // Open channel in SkaleDKG
coverage_0x03b7aa14(0x7783bccc5bda273aeb6055a640ee542610524afc24ef178e48761927a543d37a); /* line */ 
        coverage_0x03b7aa14(0xaef11f8dd72b010def5132222d18f6abdb1bdece22e4c1f7cd26a19a0312d16e); /* statement */ 
address skaleDKGAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleDKG")));
coverage_0x03b7aa14(0x2d06b4ec33de1b8f7ef1a44fb6ef53706ecadfbbbf43b33aa1a06f556b1b3a39); /* line */ 
        coverage_0x03b7aa14(0x7649fa50951af01fee98254f01fea64532921cc47979f8aa7534c0a00a1eed3d); /* statement */ 
ISkaleDKG(skaleDKGAddress).openChannel(groupIndex);
    }

    /**
     * @dev setException - sets a Node like exception
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be notes like exception
     */
    function setException(bytes32 groupIndex, uint nodeIndex) external allow(executorName) {coverage_0x03b7aa14(0x9981fbfe37f349649d8a4e2147cf8fd90fb46679be9e19e6f1e7ace7f8c5c4d1); /* function */ 

coverage_0x03b7aa14(0xe9b65eabf0587b307b2c2af6803732188e1d7bc69137e2c119b1dcebc9dc8959); /* line */ 
        coverage_0x03b7aa14(0xb8520bd7565c3e2903f1e52612b0cb6be53e65dd7418cb5f1445de62b2a99877); /* statement */ 
exceptions[groupIndex].check[nodeIndex] = true;
    }

    /**
     * @dev setPublicKey - sets BLS master public key
     * function could be run only by SkaleDKG
     * @param groupIndex - Groups identifier
     * @param publicKeyx1 }
     * @param publicKeyy1 } parts of BLS master public key
     * @param publicKeyx2 }
     * @param publicKeyy2 }
     */
    function setPublicKey(
        bytes32 groupIndex,
        uint publicKeyx1,
        uint publicKeyy1,
        uint publicKeyx2,
        uint publicKeyy2) external allow("SkaleDKG")
    {coverage_0x03b7aa14(0x8564b9b5593a57468026cbd9b39a64ea1cbb48ebd8a30cd741830fd210eb06aa); /* function */ 

coverage_0x03b7aa14(0xd90d565b0cc57ae0b1a622932406524778bee021710ed698e5f5c054f6776b3a); /* line */ 
        coverage_0x03b7aa14(0xfc2f1593b78de6dc49a821375d689456b729ccc1cc3e5001cb9dd775d409bde4); /* statement */ 
groups[groupIndex].groupsPublicKey[0] = publicKeyx1;
coverage_0x03b7aa14(0xca16a43ac47859750c9be5dfa59af0d2e3d92f72465044b2e5e21dc4144888fb); /* line */ 
        coverage_0x03b7aa14(0x99a400ca1eaaf26423ea8975d03aa1672836eae4a1b6d521179c962e99180097); /* statement */ 
groups[groupIndex].groupsPublicKey[1] = publicKeyy1;
coverage_0x03b7aa14(0x20417a15244e45e77679f556f687de20bc822ba2c04b51de1980fb7ce9809301); /* line */ 
        coverage_0x03b7aa14(0xa84a899a638b036b3aa8c297c9037e137cd384ce5ece03829624667207544fed); /* statement */ 
groups[groupIndex].groupsPublicKey[2] = publicKeyx2;
coverage_0x03b7aa14(0xbc75cd036bc5e207a78eef6f0d43effdf489976b9b41378ce16a45bdf8424636); /* line */ 
        coverage_0x03b7aa14(0xc4bcf393bcd898fc03bb50a3f0e23aa2f512063f8c1cd1fcf5976df516e421ce); /* statement */ 
groups[groupIndex].groupsPublicKey[3] = publicKeyy2;
    }

    /**
     * @dev setNodeInGroup - adds Node to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node which would be added to the Group
     */
    function setNodeInGroup(bytes32 groupIndex, uint nodeIndex) external allow(executorName) {coverage_0x03b7aa14(0xd1353f187ee90724b5b88690736638c58bd44a8bee899baa150b86a268c18a42); /* function */ 

coverage_0x03b7aa14(0x0353b4ca086b76010c64e0d967864c489d3005ced6a53c4dae3ce93b824920db); /* line */ 
        coverage_0x03b7aa14(0xe63968a83279d0aadb71d8f0f91f771f97babc1ddf603505775e7722cac8910d); /* statement */ 
groups[groupIndex].nodesInGroup.push(nodeIndex);
    }

    /**
     * @dev removeNodeFromGroup - removes Node out of the Group
     * function could be run only by executor
     * @param indexOfNode - Nodes identifier
     * @param groupIndex - Groups identifier
     */
    function removeNodeFromGroup(uint indexOfNode, bytes32 groupIndex) external allow(executorName) {coverage_0x03b7aa14(0xa4a4ce6f2864d1f6a52e1e0de142e8eb34b87ee8e5d24400471cf7323d2ea644); /* function */ 

coverage_0x03b7aa14(0x56daf687213bf6304efdc1e3f771c38ae1f6da6e0eca1345f4c25290ebcc04da); /* line */ 
        coverage_0x03b7aa14(0xfed5ca7f48136a3f6515ada3501c08ba640854b4f27f17f2c942c3ae1ea225e6); /* statement */ 
uint size = groups[groupIndex].nodesInGroup.length;
coverage_0x03b7aa14(0xc4189511a8b3e126c86178c64871e8179a9b62febb50fbcdaa2a074e9ff53765); /* line */ 
        coverage_0x03b7aa14(0x014faf60c18673a446cedf6aab1a6724a64761dd4797fb62e0c844fa08bd803f); /* statement */ 
if (indexOfNode < size) {coverage_0x03b7aa14(0xe820a9addc8c0f86852b70a67329760c4fce8292e1de26a186c8bc114cb29949); /* branch */ 

coverage_0x03b7aa14(0xcdd18d585c861e87443a638d44240f43a783685ef3419210500a434f48a507ac); /* line */ 
            coverage_0x03b7aa14(0xd52de35dee5cffedca4a314aed128d2fb56181ee4b8c1a33d167cc5fba537d9b); /* statement */ 
groups[groupIndex].nodesInGroup[indexOfNode] = groups[groupIndex].nodesInGroup[size - 1];
        }else { coverage_0x03b7aa14(0xbb4a916a1c5be748d242b67f8255de2e3aa2fa885395afd3e9ca578ac30bb259); /* branch */ 
}
coverage_0x03b7aa14(0xbf24290ecf1b610c10131221b6f7cab2618d143eba5bf4d57c461d8e606e7a6b); /* line */ 
        delete groups[groupIndex].nodesInGroup[size - 1];
coverage_0x03b7aa14(0x7374b84daeda13670d5914939bade8bfda6477cf9490f0f70fe64e05271a60b9); /* line */ 
        groups[groupIndex].nodesInGroup.length--;
    }

    /**
     * @dev removeAllNodesInGroup - removes all added Nodes out the Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function removeAllNodesInGroup(bytes32 groupIndex) external allow(executorName) {coverage_0x03b7aa14(0x02bad545719ee4e55666f749f97193c7b968cbe5384c902d681223e0804250f1); /* function */ 

coverage_0x03b7aa14(0xc50a6e757b6e99d56b2e3205bb40e0c6d25a7713f7f6cb0b9194107f058786a4); /* line */ 
        delete groups[groupIndex].nodesInGroup;
coverage_0x03b7aa14(0x1a155fc6dab2b9f530d539423faa2a5b275349455082997ea361ccd6b5c2574a); /* line */ 
        coverage_0x03b7aa14(0x0e2dbe143adf57a861fc457c178459e8233d059dbc8f9f97e663f45111549960); /* statement */ 
groups[groupIndex].nodesInGroup.length = 0;
    }

    /**
     * @dev setNodesInGroup - adds Nodes to Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param nodesInGroup - array of indexes of Nodes which would be added to the Group
    */
    function setNodesInGroup(bytes32 groupIndex, uint[] calldata nodesInGroup) external allow(executorName) {coverage_0x03b7aa14(0x9525d8f4afca864b2d0f77ab1d6044866a125604d778e266abb92cc2a258eb2b); /* function */ 

coverage_0x03b7aa14(0x322167c6962aa2f07b897cb3c4943bfce7b549221079b8b1a61e4048384d61d0); /* line */ 
        coverage_0x03b7aa14(0x7b74a3adba523ec375a20d531f8757f8827a18d069e956875fcd0e39597138de); /* statement */ 
groups[groupIndex].nodesInGroup = nodesInGroup;
    }

    // /**
    //  * @dev setNewAmountOfNodes - set new recommended number of Nodes
    //  * function could be run only by executor
    //  * @param groupIndex - Groups identifier
    //  * @param amountOfNodes - recommended number of Nodes in this Group
    // */
    // function setNewAmountOfNodes(bytes32 groupIndex, uint amountOfNodes) external allow(executorName) {
    //     groups[groupIndex].recommendedNumberOfNodes = amountOfNodes;
    // }

    // /**
    //  * @dev setNewGroupData - set new extra data
    //  * function could be run only be executor
    //  * @param groupIndex - Groups identifier
    //  * @param data - new extra data
    //  */
    // function setNewGroupData(bytes32 groupIndex, bytes32 data) external allow(executorName) {
    //     groups[groupIndex].groupData = data;
    // }

    function setGroupFailedDKG(bytes32 groupIndex) external allow("SkaleDKG") {coverage_0x03b7aa14(0x15d659ebc10af40ad9a9a1229b80551d707fe22b6b40a6f48b0e9e8fc21c6d3e); /* function */ 

coverage_0x03b7aa14(0xe3a80f8fea8790b0215e988e91249cd75f6960ff05550cc46aaed56cc13ed731); /* line */ 
        coverage_0x03b7aa14(0xbaededc5f4003528568eafd690ee0e8c1c0fb1225b67ed3109a97fd83c3c95b9); /* statement */ 
groups[groupIndex].succesfulDKG = false;
    }

    /**
     * @dev removeGroup - remove Group from storage
     * function could be run only be executor
     * @param groupIndex - Groups identifier
     */
    function removeGroup(bytes32 groupIndex) external allow(executorName) {coverage_0x03b7aa14(0x95f58c6f2f87e5388170d66bb3eea6c555741e54a65621b38102028f93f1f628); /* function */ 

coverage_0x03b7aa14(0x2b27f92cf1175735f79f8331ed133133fcd5661210ad2091c05a8d86257bf56c); /* line */ 
        coverage_0x03b7aa14(0xc6128f74e3fc2a8b0265acb69032518e38e0acb8838176d14f9fee6636008113); /* statement */ 
groups[groupIndex].active = false;
coverage_0x03b7aa14(0xf457ed7da3827e59e5e66be8bf5723c23caed890c82ae2d79d0f3011b280605c); /* line */ 
        delete groups[groupIndex].groupData;
coverage_0x03b7aa14(0xc4f1e3e32c98b1062780f843b2f9f274d6453a646d92ceaa6cbaa0a29340be4c); /* line */ 
        delete groups[groupIndex].recommendedNumberOfNodes;
coverage_0x03b7aa14(0x374c52cb4c6ecc11c760d8af2eb9321aa076c1c9ef0fd04056b62c5e872e6116); /* line */ 
        delete groups[groupIndex].groupsPublicKey;
coverage_0x03b7aa14(0x8a9eaee26a6b8c1a26971cb125ba552df4f6f3507899d808cad57bb4391c29d5); /* line */ 
        delete groups[groupIndex];
        // delete channel
coverage_0x03b7aa14(0xbe73d05eea8f45b786687db6e776064f8023d9cf052dc4d979538f726638e9c5); /* line */ 
        coverage_0x03b7aa14(0x0a30b0185d3b123b371793f253a04812a141b81853a97be46b938ce2e3111ac1); /* statement */ 
address skaleDKGAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleDKG")));

coverage_0x03b7aa14(0x86c9dca2e1e373584b390c8b42a2f4082a2a52e038efb895105a3e0d4b8f03b6); /* line */ 
        coverage_0x03b7aa14(0x13f667c4150469407979bcf0bb61cdee42f6d9d3a0b88ad209d763e203b222bf); /* statement */ 
if (ISkaleDKG(skaleDKGAddress).isChannelOpened(groupIndex)) {coverage_0x03b7aa14(0xaf9a3c3955388ff6ead6a9b516132fffd34b91177d58f24f8ad4412988a9a9c5); /* branch */ 

coverage_0x03b7aa14(0xd2dec363f1912eb392fff96c2255b2e8f1c0fffab4edccebb7b65e1b09a47731); /* line */ 
            coverage_0x03b7aa14(0x5f63ef3a2182c8236080cfccee3b265f430cd5038128c231f98e69da8c9ab264); /* statement */ 
ISkaleDKG(skaleDKGAddress).deleteChannel(groupIndex);
        }else { coverage_0x03b7aa14(0xfe6930ff74c60941c117262366100112806976ffb9e7d02823a824ba408d58a3); /* branch */ 
}
    }

    /**
     * @dev removeExceptionNode - remove exception Node from Group
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     */
    function removeExceptionNode(bytes32 groupIndex, uint nodeIndex) external allow(executorName) {coverage_0x03b7aa14(0xcbdc267b2994aebd676afa052cea971b43adabc9480b09317bc82b114f77f659); /* function */ 

coverage_0x03b7aa14(0x3773ee6c9970a7f3d9b6a5edf613e5370266b901c792d1994bdd800a8abc475d); /* line */ 
        coverage_0x03b7aa14(0x3d80e6def7cb49767bed209cabda347294d4ba81d95a1d95b07e65d71f3a6040); /* statement */ 
exceptions[groupIndex].check[nodeIndex] = false;
    }

    /**
     * @dev isGroupActive - checks is Group active
     * @param groupIndex - Groups identifier
     * @return true - active, false - not active
     */
    function isGroupActive(bytes32 groupIndex) external view returns (bool) {coverage_0x03b7aa14(0x92b862d0a42662f88282181b7c11634913cd4a16fe42a011c4183ff8a3030f51); /* function */ 

coverage_0x03b7aa14(0xb63921dc40a8c8111f60068e5d4867b5f00ed0d28d67ffe662d2b30b1210e0ce); /* line */ 
        coverage_0x03b7aa14(0xef6c1d2be5116b4e3f351e02934e2a26bd568c43bdb53379960eefc7585e39f1); /* statement */ 
return groups[groupIndex].active;
    }

    /**
     * @dev isExceptionNode - checks is Node - exception at given Group
     * @param groupIndex - Groups identifier
     * @param nodeIndex - index of Node
     * return true - exception, false - not exception
     */
    function isExceptionNode(bytes32 groupIndex, uint nodeIndex) external view returns (bool) {coverage_0x03b7aa14(0x9204e0deff839d7c2df5865ea42352c47677e5a8f3a2aa70d5406b79c09aa00e); /* function */ 

coverage_0x03b7aa14(0x5edc04b4b27f12dcb5e8c957887e9ff0f12aae865410220e8c765032de55348d); /* line */ 
        coverage_0x03b7aa14(0x36a44e90123d561f723811a00a27c94d1fdb54173fb344498d5095e5f0f8e945); /* statement */ 
return exceptions[groupIndex].check[nodeIndex];
    }

    /**
     * @dev getGroupsPublicKey - shows Groups public key
     * @param groupIndex - Groups identifier
     * @return publicKey(x1, y1, x2, y2) - parts of BLS master public key
     */
    function getGroupsPublicKey(bytes32 groupIndex) external view returns (uint, uint, uint, uint) {coverage_0x03b7aa14(0x0e4034e5c0e129cbdbe83957ca2fbd27905968b15b6d50a3d7d331293937c1bd); /* function */ 

coverage_0x03b7aa14(0x75607e87aea9ff10b5e9ce3239122dbb4e2bc7d1305192240b47ceade22513dc); /* line */ 
        coverage_0x03b7aa14(0x836e618d4e20fd828231f0889e0f3613d8eff52109d01e0e33156d7fb926e1c9); /* statement */ 
return (
            groups[groupIndex].groupsPublicKey[0],
            groups[groupIndex].groupsPublicKey[1],
            groups[groupIndex].groupsPublicKey[2],
            groups[groupIndex].groupsPublicKey[3]
        );
    }

    function isGroupFailedDKG(bytes32 groupIndex) external view returns (bool) {coverage_0x03b7aa14(0xc34dfeb1f0e2e797b1c2b8de93b36c4bf91b5fe87c591c8c1132da96c19e27d0); /* function */ 

coverage_0x03b7aa14(0x558f25cfca9a36f229988556e2f65effc21f048f13f048eadb238e81ac59e962); /* line */ 
        coverage_0x03b7aa14(0x54918176a552e4cffa7fc673a278117ae76377e6595cb857d5fea2adcc649055); /* statement */ 
return !groups[groupIndex].succesfulDKG;
    }

    /**
     * @dev getNodesInGroup - shows Nodes in Group
     * @param groupIndex - Groups identifier
     * @return array of indexes of Nodes in Group
     */
    function getNodesInGroup(bytes32 groupIndex) external view returns (uint[] memory) {coverage_0x03b7aa14(0x35cf4b936ed8aeb599bebf83a90f5a1945d5b7ca910ca20368e06948a3f405f0); /* function */ 

coverage_0x03b7aa14(0x5899d708c870cc17c32094f34b410b76e8379fbc49f88d9fc16938aea4cf6901); /* line */ 
        coverage_0x03b7aa14(0xe35fd0366389eaba42314a7058e51488565e9161477214893002a1bfa7c83311); /* statement */ 
return groups[groupIndex].nodesInGroup;
    }

    /**
     * @dev getGroupsData - shows Groups extra data
     * @param groupIndex - Groups identifier
     * @return Groups extra data
     */
    function getGroupData(bytes32 groupIndex) external view returns (bytes32) {coverage_0x03b7aa14(0x8a652de1100ed433618ab8281840af87b203a2aaa27d7745e3b219beebf2dfb1); /* function */ 

coverage_0x03b7aa14(0xb4021c2f957da0eaa19c7f316ce7cf0eb4fa4b1d3a5812ba5c5d144e951287b0); /* line */ 
        coverage_0x03b7aa14(0x452247bf9e0ef3ea22dbe0c1f0516640fc9c253e76248412dd746ee68043983b); /* statement */ 
return groups[groupIndex].groupData;
    }

    /**
     * @dev getRecommendedNumberOfNodes - shows recommended number of Nodes
     * @param groupIndex - Groups identifier
     * @return recommended number of Nodes
     */
    function getRecommendedNumberOfNodes(bytes32 groupIndex) external view returns (uint) {coverage_0x03b7aa14(0x357fb6f89bf7a47380613a0d35c433e411b260f7e92531b9b07299ef4efabfa6); /* function */ 

coverage_0x03b7aa14(0xd50ac2008551ab396c831450a198484cf46c662440d527a0931593092e9692bd); /* line */ 
        coverage_0x03b7aa14(0xe6ded83062c5528be383c86f9736a394e3707327afcde01aa7423c183ccfc9cf); /* statement */ 
return groups[groupIndex].recommendedNumberOfNodes;
    }

    /**
     * @dev getNumberOfNodesInGroup - shows number of Nodes in Group
     * @param groupIndex - Groups identifier
     * @return number of Nodes in Group
     */
    function getNumberOfNodesInGroup(bytes32 groupIndex) external view returns (uint) {coverage_0x03b7aa14(0x228e5f61f2683dd05f2c81ec6a304a6002c84250b42a41e964f6f9d8e21c9790); /* function */ 

coverage_0x03b7aa14(0x52bc9f0381f787806bfb06c15fa69709aae3a693da33250278f920fcde4234c8); /* line */ 
        coverage_0x03b7aa14(0x5e6cefead2b6301c50ce28af35c1f4a33868cac42eadffb4ba2fc605dad57b80); /* statement */ 
return groups[groupIndex].nodesInGroup.length;
    }
}
