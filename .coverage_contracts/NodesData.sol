/*
    NodesData.sol - SKALE Manager
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
import "./interfaces/IConstants.sol";
import "./interfaces/INodesData.sol";


/**
 * @title NodesData - Data contract for NodesFunctionality
 */
contract NodesData is INodesData, Permissions {
function coverage_0xde509cdf(bytes32 c__0xde509cdf) public pure {}


    // All Nodes states
    enum NodeStatus {Active, Leaving, Left}

    struct Node {
        string name;
        bytes4 ip;
        bytes4 publicIP;
        uint16 port;
        //address owner;
        bytes publicKey;
        uint32 startDate;
        uint32 lastRewardDate;
        // uint8 freeSpace;
        // uint indexInSpaceMap;
        //address secondAddress;
        NodeStatus status;
    }

    // struct to note which Nodes and which number of Nodes owned by user
    struct CreatedNodes {
        mapping (uint => bool) isNodeExist;
        uint numberOfNodes;
    }

    struct SpaceManaging {
        uint8 freeSpace;
        uint indexInSpaceMap;
    }

    // struct to note Full or Fractional Node and link to subarray
    // struct NodeLink {
    //     uint subarrayLink;
    //     bool isNodeFull;
    // }

    // // struct to note nodeIndex and remaining space
    // struct NodeFilling {
    //     uint nodeIndex;
    //     uint freeSpace;
    // }

    // array which contain all Nodes
    Node[] public nodes;

    SpaceManaging[] public spaceOfNodes;
    // array which contain links to subarrays of Fractional and Full Nodes
    // NodeLink[] public nodesLink;
    // mapping for checking which Nodes and which number of Nodes owned by user
    mapping (address => CreatedNodes) public nodeIndexes;
    // mapping for checking is IP address busy
    mapping (bytes4 => bool) public nodesIPCheck;
    // mapping for checking is Name busy
    mapping (bytes32 => bool) public nodesNameCheck;
    // mapping for indication from Name to Index
    mapping (bytes32 => uint) public nodesNameToIndex;
    // mapping for indication from space to Nodes
    mapping (uint8 => uint[]) public spaceToNodes;

    // // array which contain only Fractional Nodes
    // NodeFilling[] public fractionalNodes;
    // // array which contain only Full Nodes
    // NodeFilling[] public fullNodes;


    uint public numberOfActiveNodes = 0;
    uint public numberOfLeavingNodes = 0;
    uint public numberOfLeftNodes = 0;

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {coverage_0xde509cdf(0x3594604af84e9ce1a1cfc6030f46ca53a225b012140b69e6077656792edc966a); /* function */ 


    }

    function getNodesWithFreeSpace(uint8 freeSpace) external view returns (uint[] memory) {coverage_0xde509cdf(0x40e0f93c3091e1d4e2f6d2122cb35bcaca546ce75d219eca0b0de1305b246dba); /* function */ 

coverage_0xde509cdf(0x5289c40241154feda30f6a423c9d1db8805df773171dc08e22f69020bd2a69a9); /* line */ 
        coverage_0xde509cdf(0xf5e1e03dae0091cb6aa315313f2baebfa0db4151c12aae092560e7e28be69f7a); /* statement */ 
uint[] memory nodesWithFreeSpace = new uint[](this.countNodesWithFreeSpace(freeSpace));
coverage_0xde509cdf(0x47c568c2bb78226a34411e3eb1473abe8de38ff780d6f747053a0a557ba66635); /* line */ 
        coverage_0xde509cdf(0xc64679f72dc8502cf88b2062f6e5068d38c2ac9e5166686b04b36855e14f6b09); /* statement */ 
uint cursor = 0;
coverage_0xde509cdf(0x42f3b21f6c79a7467ac624aa198411fed04d8d5d7dbf51c2f034f2a5ece9f49a); /* line */ 
        coverage_0xde509cdf(0x483949721dc100bab47d96c5880adeec583c4f34c4fa598d154cbedc1dc4602a); /* statement */ 
for (uint8 i = freeSpace; i <= 128; ++i) {
coverage_0xde509cdf(0x757186110e48893e50e8134809401e56126e231fc77b689e3089a8776b2337fc); /* line */ 
            coverage_0xde509cdf(0x614d90d7497b61bf33d330d84d5050844b3f08c8a31cff70f13356324f36bec5); /* statement */ 
for (uint j = 0; j < spaceToNodes[i].length; j++) {
coverage_0xde509cdf(0xbc632fbb3ec23f6c353644af75aa18017d7dff1a0a75abf6ef5c5e128aec0915); /* line */ 
                coverage_0xde509cdf(0xa429f7b5a159ae1ffb9aa8ae0a3ff6f299bc8375094a112fa841fb1796a0e7b4); /* statement */ 
nodesWithFreeSpace[cursor] = spaceToNodes[i][j];
coverage_0xde509cdf(0x17aead9cebb04349375e9d308b77666f4ae432a1cc0bfe4d2763f2d0c4a31d60); /* line */ 
                ++cursor;
            }
        }
coverage_0xde509cdf(0x15e4bf4c2eec4fd7a451b911df2016013a77df8d9e9db2bb03501cca8a8c0f95); /* line */ 
        coverage_0xde509cdf(0xe98cabd4a0c53ffca97874998f7874851aad042c34864318bf8e8533f5aa0496); /* statement */ 
return nodesWithFreeSpace;
    }

    function countNodesWithFreeSpace(uint8 freeSpace) external view returns (uint count) {coverage_0xde509cdf(0xd1055ea0bc8b31588e6483ebffaab045076036228b951fdcb5838950c0c38322); /* function */ 

coverage_0xde509cdf(0xcc675c8088c65e4e0c91756f1c909d4d6b971e0b2c22bef66b8df0639d8ceec4); /* line */ 
        coverage_0xde509cdf(0x7970d8de330846980ffc0ac9836fccb6db4c7f2f37f094a811059193b77ce249); /* statement */ 
count = 0;
coverage_0xde509cdf(0x768cdfcb15e4208be69db46621408e2e26c4fff60e0b15794b7338bb389146b9); /* line */ 
        coverage_0xde509cdf(0xd74deff2b285882f3d611a8c3edba0e7114dfbddf85f49b5c93ce95b7f69db5d); /* statement */ 
for (uint8 i = freeSpace; i <= 128; ++i) {
coverage_0xde509cdf(0x77a8d587bfc4e67085fcdd304bdb8b371292870c2e98e7fc71c98a119e0f88db); /* line */ 
            coverage_0xde509cdf(0x20a597cde828e688b4444eb7c0fc994d28c8e2d0b0e92ad25c0b15c476aaf7f3); /* statement */ 
count += spaceToNodes[i].length;
        }
    }

    /**
     * @dev addNode - adds Node to array
     * function could be run only by executor
     * @param from - owner of Node
     * @param name - Node name
     * @param ip - Node ip
     * @param publicIP - Node public ip
     * @param port - Node public port
     * @param publicKey - Ethereum public key
     * @return index of Node
     */
    function addNode(
        address from,
        string calldata name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        bytes calldata publicKey
    )
        external
        allow("NodesFunctionality")
        returns (uint nodeIndex)
    {coverage_0xde509cdf(0x1e176691a1f9e6c0cb2d42bf63c3350dec2d2c3ca85ea0488d5b2fee703f8c42); /* function */ 

coverage_0xde509cdf(0xe863a550aa34ee495439233f74ddfe26f099e531ffcea53f5c3ec8b4fd60b593); /* line */ 
        coverage_0xde509cdf(0xc723245ad1325a070a19a3a7f3338c77e83015d6c02d0212f52558931625f6ea); /* statement */ 
nodes.push(Node({
            name: name,
            ip: ip,
            publicIP: publicIP,
            port: port,
            //owner: from,
            publicKey: publicKey,
            startDate: uint32(block.timestamp),
            lastRewardDate: uint32(block.timestamp),
            status: NodeStatus.Active
        }));
coverage_0xde509cdf(0xaf8e046a89630b421548ba25c661e48f7bb1f308f58f0600787d76e12caa03df); /* line */ 
        coverage_0xde509cdf(0x7b08497ea46ac9556ab7b87ae2e943055b7402e5bd2b5714078b47130dde46f0); /* statement */ 
nodeIndex = nodes.length - 1;
coverage_0xde509cdf(0x83ad45c3e2adba20b84a26fdb3fd6ab1067694726a7b0a80fdfa369cdbf36a53); /* line */ 
        coverage_0xde509cdf(0xa343fc9d06e48db357ff9bbe0bd04de5e6b07069ea3e525b71c784dcdf15a9f1); /* statement */ 
bytes32 nodeId = keccak256(abi.encodePacked(name));
coverage_0xde509cdf(0x0de8dd24185081735c0dec19ef24cd0b486054551d9a48ae064d3c7341453086); /* line */ 
        coverage_0xde509cdf(0x72d1c98bd9a94d094cbc6c375095ab7571c82e8cb77fcce25aefdef7307a7154); /* statement */ 
nodesIPCheck[ip] = true;
coverage_0xde509cdf(0x13223bf08d44386a1f3ffce8c7758f23dcebbdcef0d9b78f32d547f1a3c77d14); /* line */ 
        coverage_0xde509cdf(0x51ace250072e6ff37489c3599a54a37e767032dce6b4b0b7b3494824f41f903f); /* statement */ 
nodesNameCheck[nodeId] = true;
coverage_0xde509cdf(0x5314fb993ac024cd64a9546ab22821ff63ff7c2a64ad11120daed9cf3c71a6ca); /* line */ 
        coverage_0xde509cdf(0xa49abf7d8de315ef0ecded494d03d26c773e1f6aa80052b9c562900fbcc471d8); /* statement */ 
nodesNameToIndex[nodeId] = nodeIndex;
coverage_0xde509cdf(0x0cb8726f41acf05926940ab5f1a76a538f6638c91e9299234ef01c99970829c6); /* line */ 
        coverage_0xde509cdf(0x5f576aea0ee1878d0fbc85ef9422e690e2e3807caa353028850cde8e10833473); /* statement */ 
nodeIndexes[from].isNodeExist[nodeIndex] = true;
coverage_0xde509cdf(0x1bc9390ebe86e2011219c06e54440218e1e9589b0a6d36b188933033d2f9676a); /* line */ 
        nodeIndexes[from].numberOfNodes++;
coverage_0xde509cdf(0x5573a1125c9502f3cf53fcc83168b582c6d478d56b10ef21167a58b09f20e411); /* line */ 
        coverage_0xde509cdf(0x54badf00812eb47e8b02076ae03a656b241ecbab030696ad2e908d0f874eee13); /* statement */ 
spaceOfNodes.push(SpaceManaging({
            freeSpace: 128,
            indexInSpaceMap: spaceToNodes[128].length
        }));
coverage_0xde509cdf(0x831751e41e10387013afebdb5830f6c82326cf9b13e72e66de38eca7898061c6); /* line */ 
        coverage_0xde509cdf(0xc0945bbcca574f8b2b4154296ce9866a094d3a2e68f3c9cb6f855032f7936556); /* statement */ 
spaceToNodes[128].push(nodeIndex);
coverage_0xde509cdf(0x54da37d7cba1c66c531f65d4432a4a2596d7dc8e956dfb68753a686986457d52); /* line */ 
        numberOfActiveNodes++;
    }

    // /**
    //  * @dev addFractionalNode - adds Node to array of Fractional Nodes
    //  * function could be run only by executor
    //  * @param nodeIndex - index of Node
    //  */
    // function addFractionalNode(uint nodeIndex) external allow("NodesFunctionality") {
    //     fractionalNodes.push(NodeFilling({
    //         nodeIndex: nodeIndex,
    //         freeSpace: 128
    //     }));
    //     nodesLink.push(NodeLink({
    //         subarrayLink: fractionalNodes.length - 1,
    //         isNodeFull: false
    //     }));
    // }

    // /**
    //  * @dev addFullNode - adds Node to array of Full Nodes
    //  * function could be run only by executor
    //  * @param nodeIndex - index of Node
    //  */
    // function addFullNode(uint nodeIndex) external allow("NodesFunctionality") {
    //     fullNodes.push(NodeFilling({
    //         nodeIndex: nodeIndex,
    //         freeSpace: 128
    //     }));
    //     nodesLink.push(NodeLink({
    //         subarrayLink: fullNodes.length - 1,
    //         isNodeFull: true
    //     }));
    // }

    /**
     * @dev setNodeLeaving - set Node Leaving
     * function could be run only by NodesFunctionality
     * @param nodeIndex - index of Node
     */
    function setNodeLeaving(uint nodeIndex) external allow("NodesFunctionality") {coverage_0xde509cdf(0x866c65e6b25253e674744bb2682cdae8aba63c2fdddaaa9d542355b98e1bb27b); /* function */ 

coverage_0xde509cdf(0xe8df342a5fc8d9aec218754174f05cfb76a635758b88b3add64ab4828657fcae); /* line */ 
        coverage_0xde509cdf(0xd1d82d19c830d4ff8b8c1c8587bb5d265148ff020b3c0ada20c06e610e72b912); /* statement */ 
nodes[nodeIndex].status = NodeStatus.Leaving;
coverage_0xde509cdf(0x38258b3610e100c56295ff8a5ca507da69d71bc7155e9f9c9a11554f7f8def17); /* line */ 
        numberOfActiveNodes--;
coverage_0xde509cdf(0xcb93b8b33331f571687e6f8cbda80af4677ebdbd5001b3d230cd931addf1701f); /* line */ 
        numberOfLeavingNodes++;
    }

    /**
     * @dev setNodeLeft - set Node Left
     * function could be run only by NodesFunctionality
     * @param nodeIndex - index of Node
     */
    function setNodeLeft(uint nodeIndex) external allow("NodesFunctionality") {coverage_0xde509cdf(0x4bb63b7331cce0bfcc9cac157c1d1ac5c89e246a8ef0c8459c8661340e0ab543); /* function */ 

coverage_0xde509cdf(0xe2fa935378613e777c6719c85351ca15c49fd36468affeb8442e34f1272fdfa8); /* line */ 
        coverage_0xde509cdf(0xb0905955633bfb09b249401b8672ea63f40fdabab89ab7b61d189a32c3bb289b); /* statement */ 
nodesIPCheck[nodes[nodeIndex].ip] = false;
coverage_0xde509cdf(0xd9e980d81f8bc1db2c90cbad641f530e11e84abd474a48a8b9a39ff38b753477); /* line */ 
        coverage_0xde509cdf(0x3577413444eca57ecae90fbb03715b70a881cfad235e2b54fe43004216f5033b); /* statement */ 
nodesNameCheck[keccak256(abi.encodePacked(nodes[nodeIndex].name))] = false;
        // address ownerOfNode = nodes[nodeIndex].owner;
        // nodeIndexes[ownerOfNode].isNodeExist[nodeIndex] = false;
        // nodeIndexes[ownerOfNode].numberOfNodes--;
coverage_0xde509cdf(0xfbb29cdb77cfac6175fd53166899c34ef097497895c10acd08deb4acb7bdbbf7); /* line */ 
        delete nodesNameToIndex[keccak256(abi.encodePacked(nodes[nodeIndex].name))];
coverage_0xde509cdf(0xe16e1e8a1f08a6e83faf44768050a637c4359f1a151545a65b348f08931bb250); /* line */ 
        coverage_0xde509cdf(0x577aca387664dbfe1dc4ba3b9307449931595ce618d4fc533b896f889721a143); /* statement */ 
if (nodes[nodeIndex].status == NodeStatus.Active) {coverage_0xde509cdf(0x9811fbc01449cf6c085c433e188584edd32dc629c229b9134b6bdce4578b0df9); /* branch */ 

coverage_0xde509cdf(0x661a08b2f3ce3671173edb8f45453d91f6bd4d91b6385383b0ee7aa4d67c55e2); /* line */ 
            numberOfActiveNodes--;
        } else {coverage_0xde509cdf(0x6f8b9b63598a6e756e228732cb2143d3abc0dbf8d17efb930901ea3bc530997f); /* branch */ 

coverage_0xde509cdf(0x51357ce0f2b92477cab0ff98b9aacb1d1461df9506ea02aaa8bb8912e1ece08f); /* line */ 
            numberOfLeavingNodes--;
        }
coverage_0xde509cdf(0xb3ea87fcb7be0694058e851485cec1f8c5bad4ad1947a5cb3c198dbbd9bb6896); /* line */ 
        coverage_0xde509cdf(0x50e490d2b47bf9c47ab6c4ea68c246fb7f7b62a07a23c7e802de544d9e3add18); /* statement */ 
nodes[nodeIndex].status = NodeStatus.Left;
coverage_0xde509cdf(0x6daa3d8dd24c382632b8fc222512aab64de2b44f36efbea104d8282c274b42ff); /* line */ 
        numberOfLeftNodes++;
    }

    // /**
    //  * @dev removeFractionalNode - removes Node from Fractional Nodes array
    //  * function could be run only by NodesFunctionality
    //  * @param subarrayIndex - index of Node at array of Fractional Nodes
    //  */
    // function removeFractionalNode(uint subarrayIndex) external allow("NodesFunctionality") {
    //     if (subarrayIndex != fractionalNodes.length - 1) {
    //         uint secondNodeIndex = fractionalNodes[fractionalNodes.length - 1].nodeIndex;
    //         fractionalNodes[subarrayIndex] = fractionalNodes[fractionalNodes.length - 1];
    //         nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
    //     }
    //     delete fractionalNodes[fractionalNodes.length - 1];
    //     fractionalNodes.length--;
    // }

    // /**
    //  * @dev removeFullNode - removes Node from Full Nodes array
    //  * function could be run only by NodesFunctionality
    //  * @param subarrayIndex - index of Node at array of Full Nodes
    //  */
    // function removeFullNode(uint subarrayIndex) external allow("NodesFunctionality") {
    //     if (subarrayIndex != fullNodes.length - 1) {
    //         uint secondNodeIndex = fullNodes[fullNodes.length - 1].nodeIndex;
    //         fullNodes[subarrayIndex] = fullNodes[fullNodes.length - 1];
    //         nodesLink[secondNodeIndex].subarrayLink = subarrayIndex;
    //     }
    //     delete fullNodes[fullNodes.length - 1];
    //     fullNodes.length--;
    // }

    function removeNode(uint nodeIndex) external allow("NodesFunctionality") {coverage_0xde509cdf(0x094bc1c2c2ab4124be9c23d6d07fb471afa8c39814ec650982a9ab13e18c428d); /* function */ 

coverage_0xde509cdf(0xc08c8d0ea6a4ed9cd9051d2361476438e0834bd90e72dce28733dba49873b57a); /* line */ 
        coverage_0xde509cdf(0x0359715c6425f4c8ef86fcb89b6c83beb2969efa6a62c6fdb73e7787d5f1a91b); /* statement */ 
uint8 space = spaceOfNodes[nodeIndex].freeSpace;
coverage_0xde509cdf(0xf72dce2ab2fc34004159c5f12ecfd506806980ec4316fb5d4094e30bd1887714); /* line */ 
        coverage_0xde509cdf(0x34497a6d5d627d62effa8590e9064c63ff48cb41855b82373f156e987d4cbf00); /* statement */ 
uint indexInArray = spaceOfNodes[nodeIndex].indexInSpaceMap;
coverage_0xde509cdf(0x0521a2848af67c99e576469115aaadf797d3300af6df9ac32804411f2baa77ed); /* line */ 
        coverage_0xde509cdf(0xb5c82000a1707785a9b69e52f1bd5dbe2838e5923192437ef6a3c1492713ecc7); /* statement */ 
if (indexInArray < spaceToNodes[space].length - 1) {coverage_0xde509cdf(0x3ca189c4e61d62d1f8623779c55182d1f90897e86742b35a98a9c78a1fd0f4d9); /* branch */ 

coverage_0xde509cdf(0xbf21ccb426cf16fa9d2c63b010e631bd65f21224e1833c0b9c3d380b8609c23c); /* line */ 
            coverage_0xde509cdf(0x8aea5383f1493c3a3354fdba731825fd9b9b70448f4b4d61f4e4aa8d1e97d01f); /* statement */ 
uint shiftedIndex = spaceToNodes[space][spaceToNodes[space].length - 1];
coverage_0xde509cdf(0xc2766ca812412f777b41f9c02f43627610b92f5b064a8c8651b5653291737a98); /* line */ 
            coverage_0xde509cdf(0x94c684cdb1411d45fdc6cb0eabf28d142ee3359aad085d141312c81f4a83331c); /* statement */ 
spaceToNodes[space][indexInArray] = shiftedIndex;
coverage_0xde509cdf(0x7ff2ea2254b14d15dcbf63ab911540c78214b8d72520d5549995f587f2f0ac6d); /* line */ 
            coverage_0xde509cdf(0x7a666f37bb21b3c9f520500b65cd785d45d477052a13647c48417c1b59bb8be0); /* statement */ 
spaceOfNodes[shiftedIndex].indexInSpaceMap = indexInArray;
coverage_0xde509cdf(0x700d12ff70c685b66546992e5e1d4e46d8fb004b8a33093cd577c923cf6b7528); /* line */ 
            spaceToNodes[space].length--;
        } else {coverage_0xde509cdf(0x5fe37f70cf0cfb9da9e2825082d88a95e980aaa1d12f1bde2f5ff918a2e393c8); /* branch */ 

coverage_0xde509cdf(0x2d41dbed9c9be7a80200b6bd74dff5f699c59a1804e1f65447d0d3c573b8b378); /* line */ 
            spaceToNodes[space].length--;
        }
coverage_0xde509cdf(0xb68c87cc6d3555a593272e767505bcd9a2454bcfc1a24206e7d011e704b2afca); /* line */ 
        delete spaceOfNodes[nodeIndex].freeSpace;
coverage_0xde509cdf(0xf508adfb9ebf9272ffed557af373c46b40d28bb4feab33172981e5da2e601125); /* line */ 
        delete spaceOfNodes[nodeIndex].indexInSpaceMap;
    }

    /**
     * @dev removeSpaceFromFractionalNode - occupies space from Fractional Node
     * function could be run only by SchainsFunctionality
     * @param nodeIndex - index of Node at array of Fractional Nodes
     * @param space - space which should be occupied
     */
    function removeSpaceFromNode(uint nodeIndex, uint8 space) external allow("SchainsFunctionalityInternal") returns (bool) {coverage_0xde509cdf(0x6c858b0ee33924f0e1d03093a89229cdef55ec1513cd8c32daab66de81b29343); /* function */ 

coverage_0xde509cdf(0xb2366d3a3a5d6ce4c626650ba6680906b2ad596e19f0a007d2a600f00fa24d45); /* line */ 
        coverage_0xde509cdf(0xbd401cd40f761cabfb8937e4bca0fb12a9097e7d1000e6e11a60378c4a89ecad); /* statement */ 
if (spaceOfNodes[nodeIndex].freeSpace < space) {coverage_0xde509cdf(0x6074c8596a8cfd737ed9c8a022df5580a3e182c651b4de802e003e2e0e27ca6c); /* branch */ 

coverage_0xde509cdf(0xe653e154983c1290ff0de44d3019b9f2d32b6eb5150acf12bc5afe90629a5d77); /* line */ 
            coverage_0xde509cdf(0xfc1bd51aab93d0f6cd415b2ab461bc1ca337ccce5f3d648432a9114507adf0d8); /* statement */ 
return false;
        }else { coverage_0xde509cdf(0xfb3e8f160b158bd94391a5d3294d5cc7041c6152bfedc312d208ccdcf28ead85); /* branch */ 
}
coverage_0xde509cdf(0x495c91a4f45eca520f6124436ab1b8249ed7fdc7cdedb985352002197a6ffbed); /* line */ 
        coverage_0xde509cdf(0x1005414fa2951155029c6036f31b758cdb5f627617f839bed5cc16db95aa0151); /* statement */ 
if (space > 0) {coverage_0xde509cdf(0xaa4b97b0782fc880180039583ab8b3d3f4700103c0a31629527edf422f7cf154); /* branch */ 

coverage_0xde509cdf(0x94b8c6c49dba740b90eaa90f8a16553b7efb71aeb1b5be54813bd42dd0b28982); /* line */ 
            coverage_0xde509cdf(0x4e1a8274cd16f0bc8b4691c05e83ed8d20c361ffd736a3b1fd720b0d7d7e7b72); /* statement */ 
moveNodeToNewSpaceMap(
                nodeIndex,
                spaceOfNodes[nodeIndex].freeSpace - space
            );
        }else { coverage_0xde509cdf(0x98eda483d5ded745dbf147f0e83e529ed6b9c447c9bc591373dac88666de46ef); /* branch */ 
}
coverage_0xde509cdf(0x766720ebad0921ffdcb7b0e2a4ffd6b0091cf511bd685aa80f6c0b620cedda12); /* line */ 
        coverage_0xde509cdf(0xe96579c27b4cf8ed2f7285226214eaf1c3aafba3773ae08749e037add8f2c62a); /* statement */ 
return true;
    }

    // /**
    //  * @dev removeSpaceFromFullNodes - occupies space from Full Node
    //  * function could be run only by SchainsFunctionality
    //  * @param subarrayLink - index of Node at array of Full Nodes
    //  * @param space - space which should be occupied
    //  */
    // function removeSpaceFromFullNode(uint subarrayLink, uint space) external allow("SchainsFunctionalityInternal") returns (bool) {
    //     if (fullNodes[subarrayLink].freeSpace < space) {
    //         return false;
    //     }
    //     fullNodes[subarrayLink].freeSpace -= space;
    //     return true;
    // }

    /**
     * @dev adSpaceToFractionalNode - returns space to Fractional Node
     * function could be run only be SchainsFunctionality
     * @param nodeIndex - index of Node at array of Fractional Nodes
     * @param space - space which should be returned
     */
    function addSpaceToNode(uint nodeIndex, uint8 space) external allow("SchainsFunctionality") {coverage_0xde509cdf(0xf57f35f4562e53c86dfcf267e2519f6b7a1a5ce3f1109963ba5a451c91fdb17a); /* function */ 

coverage_0xde509cdf(0x31f0bc476c9dba6d15d26d1d5e7ffcf7f66b5ea20f508df378422e2bbf93df2e); /* line */ 
        coverage_0xde509cdf(0xe90cf04ffe28366c1b0a7b0e7d27a45b643d50be778c15b8ba00c183e6c667c3); /* statement */ 
if (space > 0) {coverage_0xde509cdf(0x4c4998dbc96580ea87dc4603a5152cb950d92b8f09e41e7a3f9ba49e8e17f495); /* branch */ 

coverage_0xde509cdf(0xff019469cc1828c0b0b8c34c40eb908fdeab569079bddae15655a9084d450826); /* line */ 
            coverage_0xde509cdf(0xc66b78e5a1f855f0b147d59650f67d90a4e694212179739baf7ebcdb01d4109d); /* statement */ 
moveNodeToNewSpaceMap(
                nodeIndex,
                spaceOfNodes[nodeIndex].freeSpace + space
            );
        }else { coverage_0xde509cdf(0x428b7b3a10b5c33c6affa1bdc1b8bda99e790b6ee7de96313b28a51c9519c445); /* branch */ 
}
    }

    // /**
    //  * @dev addSpaceToFullNode - returns space to Full Node
    //  * function could be run only by SchainsFunctionality
    //  * @param subarrayLink - index of Node at array of Full Nodes
    //  * @param space - space which should be returned
    //  */
    // function addSpaceToFullNode(uint subarrayLink, uint space) external allow("SchainsFunctionality") {
    //     fullNodes[subarrayLink].freeSpace += space;
    // }

    /**
     * @dev changeNodeLastRewardDate - changes Node's last reward date
     * function could be run only by SkaleManager
     * @param nodeIndex - index of Node
     */
    function changeNodeLastRewardDate(uint nodeIndex) external allow("SkaleManager") {coverage_0xde509cdf(0x2db7526dfbc4593c9fd9a6272ae29ca86b0cd665574478dc4afa82e130e4ecc9); /* function */ 

coverage_0xde509cdf(0xbd18812e8a72b29fb7369fe11475898964a18fac46961131512ee1a0f49293cb); /* line */ 
        coverage_0xde509cdf(0x57cec999e64648afb27f3156f35604666ee5397cac95e10a20b5919849382c00); /* statement */ 
nodes[nodeIndex].lastRewardDate = uint32(block.timestamp);
    }

    /**
     * @dev isNodeExist - checks existence of Node at this address
     * @param from - account address
     * @param nodeIndex - index of Node
     * @return if exist - true, else - false
     */
    function isNodeExist(address from, uint nodeIndex) external view returns (bool) {coverage_0xde509cdf(0xaee9fac6a59c0993fe835475d427b984e0302f71d37a45b04525df93095be0cf); /* function */ 

coverage_0xde509cdf(0x7e63ab923336f5ea2deddefddd9387fbecb383210b6d43344a39ac8cd79b3d7f); /* line */ 
        coverage_0xde509cdf(0x91ef7c81406890a886d729812218227da5c9b63ddd27a33a13e93482858bdce1); /* statement */ 
return nodeIndexes[from].isNodeExist[nodeIndex];
    }

    /**
     * @dev isTimeForReward - checks if time for reward has come
     * @param nodeIndex - index of Node
     * @return if time for reward has come - true, else - false
     */
    function isTimeForReward(uint nodeIndex) external view returns (bool) {coverage_0xde509cdf(0x26f2bbad56fadcf90458b4c757aa8f3fe0bfc75075111df8f3e5ffeff43996de); /* function */ 

coverage_0xde509cdf(0x62db6e5c84cd9918366dbe659c4400c5dd177dc1c41b4ea1a48db250b88b0d91); /* line */ 
        coverage_0xde509cdf(0x985b863d829a4cd366bfab14810a6e1792adc65d443f8733f2ff33f6ca616a09); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xde509cdf(0xfa5cc6aa25f03d065992261f7768c4f321695385a1a76c508dc681cdc027b877); /* line */ 
        coverage_0xde509cdf(0xe796d2e4bd73a37a80278852541b6beccbcbbb3990f9a91845c9834b63fabe91); /* statement */ 
return nodes[nodeIndex].lastRewardDate + IConstants(constantsAddress).rewardPeriod() <= block.timestamp;
    }

    /**
     * @dev getNodeIP - get ip address of Node
     * @param nodeIndex - index of Node
     * @return ip address
     */
    function getNodeIP(uint nodeIndex) external view returns (bytes4) {coverage_0xde509cdf(0x8e1a013ba030a73dde38e04450263aca77ba7d82ca9175997d1d4c44fb7322dc); /* function */ 

coverage_0xde509cdf(0x271262a683bbecab18a146489499390dbea99b58674c72eaca8a439e3a2d9f51); /* line */ 
        coverage_0xde509cdf(0xdf4ae81af590aab015b8ae1d78e2b3ae15f1fb34bdcc6f899bf279a9b61a6fb4); /* statement */ 
return nodes[nodeIndex].ip;
    }

    /**
     * @dev getNodePort - get Node's port
     * @param nodeIndex - index of Node
     * @return port
     */
    function getNodePort(uint nodeIndex) external view returns (uint16) {coverage_0xde509cdf(0xec5eabcb83019e1bbf262d703a57f3d62d0f78a810ccc4e32bf699d5b67ac03e); /* function */ 

coverage_0xde509cdf(0x00f2769443f833fb9045dceafc1de84bd34fbd6fb56a2c10244be2485025830c); /* line */ 
        coverage_0xde509cdf(0xc00186aea433ac94cb7bdf71bd3aa4df471a0c36c17db4006d459c4c49f11acc); /* statement */ 
return nodes[nodeIndex].port;
    }

    function getNodePublicKey(uint nodeIndex) external view returns (bytes memory) {coverage_0xde509cdf(0x97d62c5da619ecb8e9b57d85427acfa6204d1b8806210811939bf6e3e956ecb6); /* function */ 

coverage_0xde509cdf(0xbf51510805c4b501749596e8f7802da63b26444069755f3bb42758cdc61d9683); /* line */ 
        coverage_0xde509cdf(0x6672ac7760fa067c713b59c72630abe94cf85d24a856b18610ddf3784dd6ae69); /* statement */ 
return nodes[nodeIndex].publicKey;
    }

    /**
     * @dev isNodeLeaving - checks if Node status Leaving
     * @param nodeIndex - index of Node
     * @return if Node status Leaving - true, else - false
     */
    function isNodeLeaving(uint nodeIndex) external view returns (bool) {coverage_0xde509cdf(0x98754bc129593606ac3f5e4e3cc0b88623d2f30dabd2fe26237214ebad39a933); /* function */ 

coverage_0xde509cdf(0x5d49332e96e57f09fa605900a479d1c2e03c062329864649eb82ed93f329db7e); /* line */ 
        coverage_0xde509cdf(0x33ccf764aa5450f312422349e263e3f6e1f6b1848c55b1ed0c2486477d546140); /* statement */ 
return nodes[nodeIndex].status == NodeStatus.Leaving;
    }

    /**
     * @dev isNodeLeft - checks if Node status Left
     * @param nodeIndex - index of Node
     * @return if Node status Left - true, else - false
     */
    function isNodeLeft(uint nodeIndex) external view returns (bool) {coverage_0xde509cdf(0x86ef2aa4b9e3fb96e3a9802a0d1b3a1e11b549eab2e6c13111e962c7208300b2); /* function */ 

coverage_0xde509cdf(0xc90abb78073a727f77475c91929d0535e3607082c9057675391af6a1a32da671); /* line */ 
        coverage_0xde509cdf(0x7c8d989d0cd9d41b6a562bc97d02a3823741a182c1a0eb9599b7ef5b63835c40); /* statement */ 
return nodes[nodeIndex].status == NodeStatus.Left;
    }

    /**
     * @dev getNodeLastRewardDate - get Node last reward date
     * @param nodeIndex - index of Node
     * @return Node last reward date
     */
    function getNodeLastRewardDate(uint nodeIndex) external view returns (uint32) {coverage_0xde509cdf(0xd7a5f153c895ca619090f3e2ba3d37057023f2dd7401b5a5c7d745c3d76e4741); /* function */ 

coverage_0xde509cdf(0xd27239a0c71f8a2553bf861cf101b17fcb1d8477a56a0af05200629e563516fe); /* line */ 
        coverage_0xde509cdf(0x5d0896ffbfbdaf385bba13b7818ad7e2e803d93f72845fe1281eb54fcf0e1219); /* statement */ 
return nodes[nodeIndex].lastRewardDate;
    }

    /**
     * @dev getNodeNextRewardDate - get Node next reward date
     * @param nodeIndex - index of Node
     * @return Node next reward date
     */
    function getNodeNextRewardDate(uint nodeIndex) external view returns (uint32) {coverage_0xde509cdf(0xd59b02e4942898b884ee366b7818af442dcb936cdd02059c01ccdfa54ea17d98); /* function */ 

coverage_0xde509cdf(0x0f39b628d69d949bd4e7d6f1ad26b0b175ede9a761619f30f2cc24bd9de8757e); /* line */ 
        coverage_0xde509cdf(0xcf97aed7a271eb5898d78ccd84e2de99bd87f821f938d536def25feea1b50a5e); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xde509cdf(0xfc6603fec7922a48a119e00d5e2791ca59b164a1d3e220f7be1b8811595959b3); /* line */ 
        coverage_0xde509cdf(0x3324fecc00260a04917ae6c414b51e2a0a66da9065b68630c774d36a6ed8a206); /* statement */ 
return nodes[nodeIndex].lastRewardDate + IConstants(constantsAddress).rewardPeriod();
    }

    /**
     * @dev getNumberOfNodes - get number of Nodes
     * @return number of Nodes
     */
    function getNumberOfNodes() external view returns (uint) {coverage_0xde509cdf(0xe9d271c1fae4d01384af90b2a229e9c77a52534e6f4c52c0ffcffcac17cbc2de); /* function */ 

coverage_0xde509cdf(0x5822e97c1339f9dc444f8f60561d0e65e98e93e1bc1224fedcbc6bd9644ec61a); /* line */ 
        coverage_0xde509cdf(0x202860b1026a06aa2f7a6901f339352b703dd0a3bc44e06bbcd6b252c0ba2d1f); /* statement */ 
return nodes.length;
    }

    // /**
    //  * @dev getNumberOfFractionalNodes - get number of Fractional Nodes
    //  * @return number of Fractional Nodes
    //  */
    // function getNumberOfFractionalNodes() external view returns (uint) {
    //     return fractionalNodes.length;
    // }

    // /**
    //  * @dev getNumberOfFullNodes - get number of Full Nodes
    //  * @return number of Full Nodes
    //  */
    // function getNumberOfFullNodes() external view returns (uint) {
    //     return fullNodes.length;
    // }

    /**
     * @dev getNumberOfFullNodes - get number Online Nodes
     * @return number of active nodes plus number of leaving nodes
     */
    function getNumberOnlineNodes() external view returns (uint) {coverage_0xde509cdf(0x4d3e991d2e2bb09c7bda15efed7020c4a5c3b9518b6354c7259a132db7b913db); /* function */ 

coverage_0xde509cdf(0x3307e82c6d8fb1f9a01d864e92cc56a88956353285aa621d8f1332d858e5be08); /* line */ 
        coverage_0xde509cdf(0xc7a55c7ce43738fd7c0de677bbb9c01dbfa240753f5f39fd170c53d5198eed38); /* statement */ 
return numberOfActiveNodes + numberOfLeavingNodes;
    }

    // /**
    //  * @dev enoughNodesWithFreeSpace - get number of free Fractional Nodes
    //  * @return numberOfFreeFractionalNodes - number of free Fractional Nodes
    //  */
    // function enoughNodesWithFreeSpace(uint8 space, uint needNodes) external view returns (bool nodesAreEnough) {
    //     uint numberOfFreeNodes = 0;
    //     for (uint8 i = space; i <= 128; i++) {
    //         numberOfFreeNodes += spaceToNodes[i].length;
    //         if (numberOfFreeNodes == needNodes) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    // /**
    //  * @dev getnumberOfFreeNodes - get number of free Full Nodes
    //  * @return numberOfFreeFullNodes - number of free Full Nodes
    //  */
    // function enoughNodesWithFreeSpace(uint needNodes, unt ) external view returns (bool nodesAreEnough) {
    //     for (uint indexOfNode = 0; indexOfNode < nodes.length; indexOfNode++) {
    //         if (nodes[indexOfNode].freeSpace == 128 && isNodeActive(nodes[indexOfNode].nodeIndex)) {
    //             numberOfFreeFullNodes++;
    //             if (numberOfFreeFullNodes == needNodes) {
    //                 return true;
    //             }
    //         }
    //     }
    //     return false;
    // }

    /**
     * @dev getActiveNodeIPs - get array of ips of Active Nodes
     * @return activeNodeIPs - array of ips of Active Nodes
     */
    function getActiveNodeIPs() external view returns (bytes4[] memory activeNodeIPs) {coverage_0xde509cdf(0x66f394f386359ebf600a9c10980b17143cc8000e66379b7f3b557deeccff78d0); /* function */ 

coverage_0xde509cdf(0xb2569dc08337f1b794107cb3d07d2382aa8f8e0401669ee3aabd2334a96dbabe); /* line */ 
        coverage_0xde509cdf(0x816dc4e21a445ff9a66dc8c1eb7d66e11856c60318237db6cb6571e0e031c072); /* statement */ 
activeNodeIPs = new bytes4[](numberOfActiveNodes);
coverage_0xde509cdf(0x89b6306c5034f061b41567672b873bd7871f3e4d6ce281c3fb2b73eaa2f3e86a); /* line */ 
        coverage_0xde509cdf(0x44f2a042058dabbf8c1ea8de1eb91375ad3ae4a8688b19f95fb236906d151d43); /* statement */ 
uint indexOfActiveNodeIPs = 0;
coverage_0xde509cdf(0xbbaefa0a5ef22bf7328a4afcdca1e8a833a8e59c12e0e48e295ec6472767c1c1); /* line */ 
        coverage_0xde509cdf(0x424f11ee28bce49dc15bcb13a3e0c206f279da9be8ff46ef944408e8d9f3c7ae); /* statement */ 
for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
coverage_0xde509cdf(0x1b94b7d8de322c2f24c2d5ccf37936a9df263b4e17b03bed68a27278d444f2c5); /* line */ 
            coverage_0xde509cdf(0x18794fd6ee54b617c6592d0368fea1b94cda6acb68fcc89d38c41b04c1bef48f); /* statement */ 
if (isNodeActive(indexOfNodes)) {coverage_0xde509cdf(0x8a4b984cab95a45b74bb0afd4144983a5fb01352b885cceadcb37549e1638581); /* branch */ 

coverage_0xde509cdf(0x083b74072b9d59c0b16133ebf17b9dc9b8bfb1a15b05fb36b1fde7a5eef4a270); /* line */ 
                coverage_0xde509cdf(0x033932c2d6cad6afae89ae47556949ef5a3e29352e5313f0cfa1c0c296215591); /* statement */ 
activeNodeIPs[indexOfActiveNodeIPs] = nodes[indexOfNodes].ip;
coverage_0xde509cdf(0x6c19f32a90653f9c730d5f200c4d42ba51933b249e8c4b00b1a9ef5d55be7a86); /* line */ 
                indexOfActiveNodeIPs++;
            }else { coverage_0xde509cdf(0xb3e67205baaf2ae13a7660a22f26a568ac383b5063fca66be3db663090c9fc21); /* branch */ 
}
        }
    }

    /**
     * @dev getActiveNodesByAddress - get array of indexes of Active Nodes, which were
     * created by msg.sender
     * @return activeNodesbyAddress - array of indexes of Active Nodes, which were created
     * by msg.sender
     */
    function getActiveNodesByAddress() external view returns (uint[] memory activeNodesByAddress) {coverage_0xde509cdf(0x914a05b90058131b6798af0d19444bbd60c78b253e5be45d6760fca106b30931); /* function */ 

coverage_0xde509cdf(0x4bf25199f791461fed6b57b8341d6e7a3b28a283db6bb9f570e8a8db07e92187); /* line */ 
        coverage_0xde509cdf(0xe460caeb12c5b95925f6569c273c6f031fda936420b8ce407f9af45cde38235c); /* statement */ 
activeNodesByAddress = new uint[](nodeIndexes[msg.sender].numberOfNodes);
coverage_0xde509cdf(0xe41d9bb9651b257697616bc280967cd9fe1a7dc9e95fed5700e27e812e63e7d0); /* line */ 
        coverage_0xde509cdf(0xea42e32af397d63075f32479ca6169dace7d3be1e460c956439a8343ad9a4429); /* statement */ 
uint indexOfActiveNodesByAddress = 0;
coverage_0xde509cdf(0x538896da19313f6090654c203f8d7bba87bf2aac8b4186a87a802d6b69b5afd9); /* line */ 
        coverage_0xde509cdf(0x7bf856020af18145756bc716948f7490b843173009e44b1bf6fc93a37f5d5e95); /* statement */ 
for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
coverage_0xde509cdf(0x3b6e3ca67adec48aad1d76e1f194ad4ac5ec441b3cb9aea2cc57a8c46ef8a147); /* line */ 
            coverage_0xde509cdf(0xac4858433125d351303450b41080a3eba29916e237a886738a2186e1f5f4ce72); /* statement */ 
if (nodeIndexes[msg.sender].isNodeExist[indexOfNodes] && isNodeActive(indexOfNodes)) {coverage_0xde509cdf(0x4bf23cf7202826553c56f17fd806cd289c39cd954364d43f1a090139d323c4b2); /* branch */ 

coverage_0xde509cdf(0x596c219e979520146796a1f6c7bec437b9cd24252507b000b097209ec878064a); /* line */ 
                coverage_0xde509cdf(0x098aec764ebcb1eabc8ef6185b6b7db1a92dcb52c3faa0f66e2e8083e8d5f67e); /* statement */ 
activeNodesByAddress[indexOfActiveNodesByAddress] = indexOfNodes;
coverage_0xde509cdf(0x28c90d72961706c050f8a8ac1bc53775c4fac3d7977ddcb4dc69500304cedc04); /* line */ 
                indexOfActiveNodesByAddress++;
            }else { coverage_0xde509cdf(0x5d97234a3b2728e6900baf89bc8facb944a97d7474c82d3e44aa1816e98f43aa); /* branch */ 
}
        }
    }

    // function getActiveFractionalNodes() external view returns (uint[] memory) {
    //     uint[] memory activeFractionalNodes = new uint[](fractionalNodes.length);
    //     for (uint index = 0; index < fractionalNodes.length; index++) {
    //         activeFractionalNodes[index] = fractionalNodes[index].nodeIndex;
    //     }
    //     return activeFractionalNodes;
    // }

    // function getActiveFullNodes() external view returns (uint[] memory) {
    //     uint[] memory activeFullNodes = new uint[](fullNodes.length);
    //     for (uint index = 0; index < fullNodes.length; index++) {
    //         activeFullNodes[index] = fullNodes[index].nodeIndex;
    //     }
    //     return activeFullNodes;
    // }

    /**
     * @dev getActiveNodeIds - get array of indexes of Active Nodes
     * @return activeNodeIds - array of indexes of Active Nodes
     */
    function getActiveNodeIds() external view returns (uint[] memory activeNodeIds) {coverage_0xde509cdf(0x9ab909bd3b5d6ac4e9ddb551407a05bf06cce93387fc6d251d68ff0d40128ef8); /* function */ 

coverage_0xde509cdf(0x93daa3bbce1b38512ba54575f684db5e00bf3cd3acc46685beff17ff337cdd55); /* line */ 
        coverage_0xde509cdf(0x549608332c2679b46805f6cc434650b1200c0afd1cdfb1c809411fc15e943e79); /* statement */ 
activeNodeIds = new uint[](numberOfActiveNodes);
coverage_0xde509cdf(0x79718ca6a62379619d97d73b25f9c700643d0562b364f13d0b66b637739efdb0); /* line */ 
        coverage_0xde509cdf(0xa1268e48113a3eff6d04c9b1a79a9e2ebae8a22113277c628f157754fdb44ea6); /* statement */ 
uint indexOfActiveNodeIds = 0;
coverage_0xde509cdf(0x4071f1945fa946e93cc7e92d4069f35feae1e5b7d98a86ecdd670df722d82d7e); /* line */ 
        coverage_0xde509cdf(0x11d98e1be6dac3d5eff568ce53543ef1e2989f2de66758f53cac5039c67e1058); /* statement */ 
for (uint indexOfNodes = 0; indexOfNodes < nodes.length; indexOfNodes++) {
coverage_0xde509cdf(0x7b869ce0422b8f697bf63368c0451acae40cf7464378e78b8071b2cc1f0783bc); /* line */ 
            coverage_0xde509cdf(0xe9a34fded851beb3a47bcd388cda5fc2fbee9d863b34f57b6fd8394ccd3f4a31); /* statement */ 
if (isNodeActive(indexOfNodes)) {coverage_0xde509cdf(0x90c356f8b06c1cdf824a2e6984bca4780ad02cf91afb47a751c178b48c31f2a9); /* branch */ 

coverage_0xde509cdf(0x7a2239e8d8379c5c2b13cef7407a4b1e33699174134d92dbcbe0974cf7330a55); /* line */ 
                coverage_0xde509cdf(0x0e0f372fab0770eac86ef3f061b1a5e9bf7ad3bb6417aedb40ffd2c09b5e8145); /* statement */ 
activeNodeIds[indexOfActiveNodeIds] = indexOfNodes;
coverage_0xde509cdf(0xc849ee376225f26e5691b2f9c59d1b155eb5c72f00ab1b0cb7651cec03b2bcca); /* line */ 
                indexOfActiveNodeIds++;
            }else { coverage_0xde509cdf(0x34605efedec07862d763b33251c5673ef9c641284a6e5f13172a2835752d937d); /* branch */ 
}
        }
    }

    function getNodeStatus(uint nodeIndex) external view returns (NodeStatus) {coverage_0xde509cdf(0x9cff4fcc4c275bdc1920779cf25b4e2e41aa1cdaf65ffe82fdd149db79d61aa5); /* function */ 

coverage_0xde509cdf(0xfcda8f5ef7d7a48a1bcbe1cc0cae5c33b2c789bce408585c4dee15cf791d14dd); /* line */ 
        coverage_0xde509cdf(0xba9ae72f9ede79bf444216730dbde147ac92954c1f941de983a76c25cac1b07d); /* statement */ 
return nodes[nodeIndex].status;
    }

    /**
     * @dev isNodeActive - checks if Node status Active
     * @param nodeIndex - index of Node
     * @return if Node status Active - true, else - false
     */
    function isNodeActive(uint nodeIndex) public view returns (bool) {coverage_0xde509cdf(0x9bdf9ec8c9483993694c200e2e0be8436f186242609220a5095f7c050352ed7f); /* function */ 

coverage_0xde509cdf(0x7966499539bed2ae753cd5bd0c04ad0187b1809313418fed149dcab82e1e5cd3); /* line */ 
        coverage_0xde509cdf(0xa276523487ad45e9a359b71d0ac03337af3630c48b6200e8f485288159dedb47); /* statement */ 
return nodes[nodeIndex].status == NodeStatus.Active;
    }

    function moveNodeToNewSpaceMap(uint nodeIndex, uint8 newSpace) internal {coverage_0xde509cdf(0x2fcc596228afea8894303f7911cb1c2bae542db70061249b717428ceaf390d0c); /* function */ 

coverage_0xde509cdf(0x65f32e628d3448a8ff710937dae4ec20fa17656e85fff56797b0e4850b04cddc); /* line */ 
        coverage_0xde509cdf(0x8a51039b0a2dec74c3920992572682b1e53b5a74aed601be8f0d4b0c89002ae1); /* statement */ 
uint8 previousSpace = spaceOfNodes[nodeIndex].freeSpace;
coverage_0xde509cdf(0xefd348c726d6ca80f65487cbfd0cfd76c6e3de23bdbfa912c81f3b322677b4c3); /* line */ 
        coverage_0xde509cdf(0x392dee8977d2b34b34be997a97236a8b3797fdabf8e084ee70c7044077b8e9af); /* statement */ 
uint indexInArray = spaceOfNodes[nodeIndex].indexInSpaceMap;
coverage_0xde509cdf(0x9ad7941195a8cbbbf0c3836731983155909522fa76cbfddf2ce0483fdef2d1f7); /* line */ 
        coverage_0xde509cdf(0xba2305aa290f7368ca44211a744eb24b7549c8aedf356bfaeb1e814a9f65f6c2); /* statement */ 
if (indexInArray < spaceToNodes[previousSpace].length - 1) {coverage_0xde509cdf(0x041601a72399f5d879179a38f5066c1fc689126fee7807cc2b501effceb075fa); /* branch */ 

coverage_0xde509cdf(0xe7f4cc98c8e8ba5f6028fd9266fe137a8f18affbe7983c046e5cf10857e4c962); /* line */ 
            coverage_0xde509cdf(0xecd94b6788719f1b239333936080ea7312aec8ae303a14ace401bff60b02dedb); /* statement */ 
uint shiftedIndex = spaceToNodes[previousSpace][spaceToNodes[previousSpace].length - 1];
coverage_0xde509cdf(0x7e6e531bbb6cb570791e91b76b8bedb7df11d30abc06394465752af2920c1442); /* line */ 
            coverage_0xde509cdf(0xb165dbe2546589d4b82ab7110579a6ecc948a36a86df23f3e1c82335b03ba2a5); /* statement */ 
spaceToNodes[previousSpace][indexInArray] = shiftedIndex;
coverage_0xde509cdf(0x65156fdbf9b5136d3e337989f246a0c5b1c0003d9f06124ff43d0333b73cb1b5); /* line */ 
            coverage_0xde509cdf(0xb2f4bad0b45254e5cf229a98d851b43b991d213eceb1e6d8f38de546bbf11e89); /* statement */ 
spaceOfNodes[shiftedIndex].indexInSpaceMap = indexInArray;
coverage_0xde509cdf(0xebce857f161a8728ffee9ada0a0ca53b4678890074001b6822f30b44f21f793a); /* line */ 
            spaceToNodes[previousSpace].length--;
        } else {coverage_0xde509cdf(0xd7c622009c89f8df880c94775fc446af475865d3bd47d9d782d896b226f61a66); /* branch */ 

coverage_0xde509cdf(0x9df5cdf410be9b01c5c5308a7389904231726ebe7f6b4688e510d530188539d0); /* line */ 
            spaceToNodes[previousSpace].length--;
        }
coverage_0xde509cdf(0xd50639b1f4cfaad6445ddaab984eb4d8e201cc19337abfa8490e28e635aad1aa); /* line */ 
        coverage_0xde509cdf(0xe5899c0fc205fc9f7ede689722c61f1e4249dcfb847a4191d25795dce12bcd19); /* statement */ 
spaceToNodes[newSpace].push(nodeIndex);
coverage_0xde509cdf(0x69b65336491aaa8284f990dc95e1487d7e33971ef723f04d936461ae78298a76); /* line */ 
        coverage_0xde509cdf(0x1e84672cc4d0f8a564dce73de82252152ec06caebb8edcf9ca8d7663248a847e); /* statement */ 
spaceOfNodes[nodeIndex].freeSpace = newSpace;
coverage_0xde509cdf(0x38634835b56f12a579317e86fcb23cb70fca707421492a63917e25f81fbb7445); /* line */ 
        coverage_0xde509cdf(0xed8b2d932480ba8a1175557f9052ad1cc7facdea1fe5316e30afaa583bab3584); /* statement */ 
spaceOfNodes[nodeIndex].indexInSpaceMap = spaceToNodes[newSpace].length - 1;
    }
}
