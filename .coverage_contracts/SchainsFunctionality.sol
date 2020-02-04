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
pragma experimental ABIEncoderV2;

import "./Permissions.sol";
import "./interfaces/ISchainsData.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/ISchainsFunctionalityInternal.sol";
import "./interfaces/INodesData.sol";
import "./SchainsData.sol";
import "./SchainsFunctionalityInternal.sol";
import "./thirdparty/StringUtils.sol";



/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionality is Permissions, ISchainsFunctionality {
function coverage_0x80b19128(bytes32 c__0x80b19128) public pure {}


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

    constructor(string memory newExecutorName, string memory newDataName, address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x80b19128(0x0671878758df295becc8a97a80de1d5fa25286878794cdb3c4918406bc366645); /* function */ 

coverage_0x80b19128(0x3fa1a5ab78404e0f728c7fd999aa5ce5d33200666bb73dba3a448f338dffb2ed); /* line */ 
        coverage_0x80b19128(0x37ed8a100aa3e9de40eb1025361aeef56706b89be87fe6447b1c1e173cbd0df9); /* statement */ 
executorName = newExecutorName;
coverage_0x80b19128(0x1c8ffdd14311def7155b99424b882411fb2d2c1bfb60d9ed860fbabad8b527e2); /* line */ 
        coverage_0x80b19128(0x9c24f7f28980d2ff5a0951a76c9f0a755effd17b81e3c639c0dedd53c25c1a2a); /* statement */ 
dataName = newDataName;
    }

    /**
     * @dev addSchain - create Schain in the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param deposit - received amoung of SKL
     * @param data - Schain's data
     */
    function addSchain(address from, uint deposit, bytes calldata data) external allow(executorName) {coverage_0x80b19128(0x3cf5f975ad4a6a64cf5646dd29f77bb173d47bbbf727bb996fd33c9ab1f5c8bf); /* function */ 

coverage_0x80b19128(0x3dbf5036695af89ccdfaf90b91667b16b67cf5213fabba74850d9b84d5e08210); /* line */ 
        coverage_0x80b19128(0x1e30ccfe58498d12abb399b0257c56cd3d4a43d587f6e72a9ea73b3ff7c8905f); /* statement */ 
uint numberOfNodes;
coverage_0x80b19128(0x971de7e34e6c8e85871b67b8f7c77528d3446495fdd8de8cc79cf5c96da045a5); /* line */ 
        coverage_0x80b19128(0xce1d498a9694b12959b564585888217703e6623b5b6a40744c981cec55c5c4a5); /* statement */ 
uint8 partOfNode;

coverage_0x80b19128(0xf7a0e21ada45c7b7742cd12d278af6946a42a8c1dd36c25afc37ebbdac723242); /* line */ 
        coverage_0x80b19128(0xb4e8a8274ca7df984c38c1cfeac01a525062105065e100c9f6caa79ffb3f1cb4); /* statement */ 
address schainsFunctionalityInternalAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionalityInternal")));

coverage_0x80b19128(0xe92fa2b923a77b83d2d137bb0083d947049974ebab722af3b1e537b86a27f9ee); /* line */ 
        coverage_0x80b19128(0xa110d72e0e0ad5d3f258662ce9de21b63708321647e8c3a997e4fe3422ac1d19); /* statement */ 
SchainParameters memory schainParameters = fallbackSchainParametersDataConverter(data);

coverage_0x80b19128(0xcf78085a1dc16bffbdccda0b8a3a7d763638dfc67243ead6556d1dea5e101a9c); /* line */ 
        coverage_0x80b19128(0xe84d1aa72b1c114612c74fcdbf399f07cf7f5ff481637161450207e8d36ce4c9); /* assertPre */ 
coverage_0x80b19128(0xc3195233e8184465ced4cfd4e18ae52c851f9ea0d3da75050c0f795b50ebfcba); /* statement */ 
require(schainParameters.typeOfSchain <= 5, "Invalid type of Schain");coverage_0x80b19128(0xf3ed177a7f85e3227430406bd98e64cc839505bef177c296cd1599cca9a778d3); /* assertPost */ 

coverage_0x80b19128(0xf8420081dcd47931c796c626c9b113e35253a5c984940e7f21358d34445f8f44); /* line */ 
        coverage_0x80b19128(0x2545709314328c0790921bd0b9530b3b5e0539f93afa3e41d20aa65a4a5138fe); /* assertPre */ 
coverage_0x80b19128(0x7666e62063f86b72812369f06a05c6aca93fd9d4ca19560369f6e65140130e93); /* statement */ 
require(getSchainPrice(schainParameters.typeOfSchain, schainParameters.lifetime) <= deposit, "Not enough money to create Schain");coverage_0x80b19128(0x5f952aa6bdda568879d325c0245fa9d51e87266c7861d3ed25e1df502f390313); /* assertPost */ 


        //initialize Schain
coverage_0x80b19128(0x6e63ef6e47a6d7a1c128bdd073c3ff3256ead16bff72e9f53412c7e9a694aa76); /* line */ 
        coverage_0x80b19128(0x726f92d91e3e6b8a0a8007c2a74e77ba9969efe2c14a4ed7e9c190ae07ab640c); /* statement */ 
initializeSchainInSchainsData(
            schainParameters.name,
            from,
            deposit,
            schainParameters.lifetime);

        // create a group for Schain
coverage_0x80b19128(0x726f00c05a21ca78bc10408941478c1282f4d5c660c7ae1f62670eb6bb4625c0); /* line */ 
        coverage_0x80b19128(0x9b984f52237f70948e02407fcae5e199c095ef6a4f861c42dc02821e088fd4aa); /* statement */ 
(numberOfNodes, partOfNode) = ISchainsFunctionalityInternal(
            schainsFunctionalityInternalAddress
        ).getNodesDataFromTypeOfSchain(schainParameters.typeOfSchain);

coverage_0x80b19128(0x87f761e5b22066a09fe9afd23552cc9ea80c93d989e673abb0166bd65d789892); /* line */ 
        coverage_0x80b19128(0xb5e006e2306449d611aea339b04b120a01898b476561422b0aded7d19e6dbcd2); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).createGroupForSchain(
            schainParameters.name, keccak256(abi.encodePacked(schainParameters.name)), numberOfNodes, partOfNode);

coverage_0x80b19128(0x0e51739f8b7102c9bcfd984a76a107c743228981eb51076eff8e74c6ba11f266); /* line */ 
        coverage_0x80b19128(0xbedda70a874f50e729b7e9a0a1e93f3c80b3b2704e4c2c8f49251f6e3cb1907b); /* statement */ 
emit SchainCreated(
            schainParameters.name, from, partOfNode, schainParameters.lifetime, numberOfNodes, deposit, schainParameters.nonce,
            keccak256(abi.encodePacked(schainParameters.name)), uint32(block.timestamp), gasleft());
    }

    /**
     * @dev getSchainNodes - returns Nodes which contained in given Schain
     * @param schainName - name of Schain
     * @return array of concatenated parameters: nodeIndex, ip, port which contained in Schain
     */
    /*function getSchainNodes(string schainName) public view returns (bytes16[] memory schainNodes) {
        address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
        bytes32 schainId = keccak256(abi.encodePacked(schainName));
        uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
        schainNodes = new bytes16[](nodesInGroup.length);
        for (uint indexOfNodes = 0; indexOfNodes < nodesInGroup.length; indexOfNodes++) {
            schainNodes[indexOfNodes] = getBytesParameter(nodesInGroup[indexOfNodes]);
        }
    }*/

    /**
     * @dev deleteSchain - removes Schain from the system
     * function could be run only by executor
     * @param from - owner of Schain
     * @param name - Schain name
     */
    function deleteSchain(address from, string calldata name) external allow(executorName) {coverage_0x80b19128(0x60ceb89f2c0f140396387d4b334251b080fa5cd764ffb31a5826c00cef4a3c4a); /* function */ 

coverage_0x80b19128(0xc9b3b2cf3cf000ec8568f27173535bf3210c364a54f98fca1e5dad12aaabe240); /* line */ 
        coverage_0x80b19128(0x491878060f55fab3ce2aa2fcafa6df2d63b34bf90a831ad1da611c8b1e5090f7); /* statement */ 
bytes32 schainId = keccak256(abi.encodePacked(name));
coverage_0x80b19128(0x8bccdfff7e89cf538235151a4fc04213137ccfce33ef4ced47897ee5e6b7d97b); /* line */ 
        coverage_0x80b19128(0xca14d139db1a7a0d117f207eb0d768762acd52e62472dca5496cf1f9adc676a9); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
        //require(ISchainsData(dataAddress).isTimeExpired(schainId), "Schain lifetime did not end");
coverage_0x80b19128(0x11272f2c518d3551cc6e1c599dcd57286f9c26f62709f48dc866f229aa72c399); /* line */ 
        coverage_0x80b19128(0x578b1a453676c7b7dd2006b2c333c908e79494e70f1b252508aa85ab42ead8d5); /* assertPre */ 
coverage_0x80b19128(0x527d16c36f4acc87d482e40ff6f382cbce175f4f120b6e3dd97b4dd7a6220149); /* statement */ 
require(ISchainsData(dataAddress).isOwnerAddress(from, schainId), "Message sender is not an owner of Schain");coverage_0x80b19128(0x4b5dffddec3e1ee2bf408091851a0928944e2f5eed7b4d438f2e7b163fbab061); /* assertPost */ 

coverage_0x80b19128(0x71311c6793b9c13ced160df2a3dec9abf165165cb73076e5038ce0c6dcb1a09d); /* line */ 
        coverage_0x80b19128(0x775ec0dae900da4ed06ec64c75c05ef7ed73a63a633f46e6a5c5a0fb373ef5bf); /* statement */ 
address schainsFunctionalityInternalAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionalityInternal")));

        // removes Schain from Nodes
coverage_0x80b19128(0x24bbad0d6b291e42ed38ae80a5f2b61e32acc1801a884d13f2bd1ad3c18782d4); /* line */ 
        coverage_0x80b19128(0x705900a3d7d346b3d84ed6efe4f494a2ba0cea411a3607bd69287854cd642ae0); /* statement */ 
uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
coverage_0x80b19128(0xcbd77b30228ba2aeb4635d06041fe14083816ed51c1bf346255a700742e4555a); /* line */ 
        coverage_0x80b19128(0x4e9b972a795ec973b97bc99b22aabea5e86427e51fd008720bed91f52e6e7ed1); /* statement */ 
uint8 partOfNode = ISchainsData(dataAddress).getSchainsPartOfNode(schainId);
coverage_0x80b19128(0x9162c105e3be71bd249d91876c411e75e034cb38a88d67c7eabc7ce782de588f); /* line */ 
        coverage_0x80b19128(0xe0d4b1fceec8c41d90d79a96dd03c4201265e744d275cdcbda7d22a0d00b8363); /* statement */ 
for (uint i = 0; i < nodesInGroup.length; i++) {
coverage_0x80b19128(0x2035667241629ae203995060b44e5d20982de8241e7ed5b3f7755d9a7dd76c49); /* line */ 
            coverage_0x80b19128(0x0f082dfb348dde11fbc12fc7865ae25cc5d3fc2dd5d94d1cb4151e6aa5c0f078); /* statement */ 
uint schainIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
coverage_0x80b19128(0x925fa4650da3d5bbcf212fb7f217914ee5296b72b067e9ef0f16122c8920f5e2); /* line */ 
            coverage_0x80b19128(0xe915a69de9e2e3b8247905ebdd83bcc5616969b0a86fb164f920234c196ee034); /* assertPre */ 
coverage_0x80b19128(0x2a7813030b681493f2399b8c076b7f2a944c6917038b7e5cd3e4dc0590d5769b); /* statement */ 
require(
                schainIndex < ISchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");coverage_0x80b19128(0x61b6f5c6ab4c494dd6ca8b4dd2d6aec32d110428a68ce181873bac5f0811e8e2); /* assertPost */ 

coverage_0x80b19128(0x48df4351ede1bd28347bb5d29919236895e488236c9532313f334838a3b2fbe6); /* line */ 
            coverage_0x80b19128(0x03b1e5d46f2fd26154dacb5f1429f18395389d0ccbb308f603fd5d973047d306); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromSchain(nodesInGroup[i], schainId);
coverage_0x80b19128(0x742ec53ccd90ee015d428f701bc2f1292dba6ab1291da3b2040ffef01b18a61d); /* line */ 
            coverage_0x80b19128(0x3bd89bf21907d2422afc0ec5c4a7ee63c1f1e430ad2b569813ca0e58b106e50a); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromExceptions(schainId, nodesInGroup[i]);
coverage_0x80b19128(0xb201d931ffab10cdec605ee90c65915ea156093189070fb1e77a55c47dae9a7f); /* line */ 
            coverage_0x80b19128(0x49e68ca2be4cc25d67cdc77df1e03f5d0e7a6642a77a640f7a8305ab632ebd14); /* statement */ 
addSpace(nodesInGroup[i], partOfNode);
        }
coverage_0x80b19128(0x9fa936d8530603a52f455c35125ff2f451b510c2c3fa8290056652d382d9f6c1); /* line */ 
        coverage_0x80b19128(0xbe42d66153071d850b5a22abd3b9aca0549baddeb256b9e5de44a02c9301c0bc); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).deleteGroup(schainId);
coverage_0x80b19128(0xfa21aeb4dd85cd79d37617df9a739fc833a67737be967723c3319b9b1cf05025); /* line */ 
        coverage_0x80b19128(0xa330f584c15c96284d5a9a66cdbfde244df213e31021a45d1fe6a2f519a5b77a); /* statement */ 
ISchainsData(dataAddress).removeSchain(schainId, from);
coverage_0x80b19128(0x83c71c9705c9b44c6768540d4557ac1bedd3c0eba0b2d455aa3cb2c1826ce3c5); /* line */ 
        coverage_0x80b19128(0x5b1c527f7da5044602b8c5734178359862208b147926f33c9a2a4c7e8ce92b5b); /* statement */ 
emit SchainDeleted(from, name, schainId);
    }

    function deleteSchainByRoot(string calldata name) external allow(executorName) {coverage_0x80b19128(0x12106eddd20d364c74aea54ca4cf93993e5fc741465a08a182af923e8e6f7e54); /* function */ 

coverage_0x80b19128(0x3c122246126a7f392a730a14984580228b7971937669704e12a12790df641b36); /* line */ 
        coverage_0x80b19128(0x03f956954dd80a4411887ccb2a96e0033ad1126ed13980dfd7085f7c452c685f); /* statement */ 
bytes32 schainId = keccak256(abi.encodePacked(name));
coverage_0x80b19128(0x00396e0aaed0ff8fa757aa9ca72623a4090099ef2773496b7ee1853b237d0f04); /* line */ 
        coverage_0x80b19128(0xdd87009483d93836083896e50d2f21eede80b9fc672249d3fc708deaf64ecd5f); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0x80b19128(0x59aaa8994f5db4d1e582d74ad044e33d264a7f32c0a0cc8682e33ff58ce13019); /* line */ 
        coverage_0x80b19128(0xee0ea980df2cabfd674f8f6cc15db2a4ac8ac370431cc0c8f6a41f72bd3d6a52); /* statement */ 
address schainsFunctionalityInternalAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionalityInternal")));
coverage_0x80b19128(0x572a4595b1841d884822d92815596bdd3d27e03ff9af5ffff595cd1f555b8d03); /* line */ 
        coverage_0x80b19128(0x5b870a46944d7c72ad5a4089c82e58be12efc117e2115a2bc3acc7e33bcf512e); /* assertPre */ 
coverage_0x80b19128(0xbf23020602801a7a2839f0e99b7bc82e50c204d6aca87fd7fa08ee92cc259c78); /* statement */ 
require(ISchainsData(dataAddress).isSchainExist(schainId), "Schain does not exist");coverage_0x80b19128(0x7b5a6d6a10a538ef7a0038c49d48ce9ed60be7a023e8e8933ca9158f6a7e4113); /* assertPost */ 


        // removes Schain from Nodes
coverage_0x80b19128(0x9b39b8abd7d432ac5fd3450553abaeff1ed31e5070f6f90a76e6ba8a5f085788); /* line */ 
        coverage_0x80b19128(0x01f40e35e72b550ebd28537a0daf056085ce4718cfb41118f76d0cbd769898f3); /* statement */ 
uint[] memory nodesInGroup = IGroupsData(dataAddress).getNodesInGroup(schainId);
coverage_0x80b19128(0xdc1b8b56dca58a9cb4b51103e7aee63e17d9ab0e0db8559b66ad3bcfb5f5e6a5); /* line */ 
        coverage_0x80b19128(0x715cac8209433ed90517602da84d447fb8314cd0888c92793b9fb076e81f2c85); /* statement */ 
uint8 partOfNode = ISchainsData(dataAddress).getSchainsPartOfNode(schainId);
coverage_0x80b19128(0x19018c9cb9b60e2ba7f66fe68347a4672c2148ba15bfbfcaa0f6bf6547fbb226); /* line */ 
        coverage_0x80b19128(0xc147f54df3f549b2e61a1b9f119e74eeedd44071756e6454569542dfab609bd7); /* statement */ 
for (uint i = 0; i < nodesInGroup.length; i++) {
coverage_0x80b19128(0x64671c3ac75eba52bad2feb24167e9000ddfe38b8e03fff32680beec7b612c4b); /* line */ 
            coverage_0x80b19128(0x2e0b8a1068d6820b7d7bf5410e9fd25a689b78867861c7b37cce5f9c99cf0c80); /* statement */ 
uint schainIndex = ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).findSchainAtSchainsForNode(
                nodesInGroup[i],
                schainId
            );
coverage_0x80b19128(0xc1af5cc8c872463fa50a9930995bbeb62d5a71286391d2f3e3965d614532b8e0); /* line */ 
            coverage_0x80b19128(0x92ad12acac7c7babafdc4fc6510eed7a40643ecf34040b413cedd1abcf8f83cb); /* assertPre */ 
coverage_0x80b19128(0x158cd9ce4b2e052df8172041df756fca2a00de8b1242b703e124a3af680cc051); /* statement */ 
require(
                schainIndex < ISchainsData(dataAddress).getLengthOfSchainsForNode(nodesInGroup[i]),
                "Some Node does not contain given Schain");coverage_0x80b19128(0x5f13f963e7906229f244c1e856e95ef8cf25301eefefc454ba6e1cf05eb09a64); /* assertPost */ 

coverage_0x80b19128(0xeceb6a60432b7c18a8aeec60fab7a0905ebb7b7dc73ebf1b42b9160e8d4ac317); /* line */ 
            coverage_0x80b19128(0xc33e279dc1c73f5123f53b1792c2cae80095132a8bf75d5d82967d6160be7565); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromSchain(nodesInGroup[i], schainId);
coverage_0x80b19128(0x564c567cb428f385f0b6e098b1910d9df8217ab7da16ca19fe72d9c3a3fe4527); /* line */ 
            coverage_0x80b19128(0x2b7d8e9124dea0ff62f7694cfa49c47014dc1748cd0caac5ea17c63adbd5c02d); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).removeNodeFromExceptions(schainId, nodesInGroup[i]);
coverage_0x80b19128(0xbbd840106d8c2aaee8f3ed687d81fee112c7c4af31e94f1746baf5aec72b7b65); /* line */ 
            coverage_0x80b19128(0x664e77332b4e33b7ed74bd4d238a629e4d5b804d83d57471e1556279fcbc5fde); /* statement */ 
addSpace(nodesInGroup[i], partOfNode);
        }
coverage_0x80b19128(0x8598eef9b4cd4c016a343c5ceb9ae81d939f56bbac3d2c609c9a2494123bee5d); /* line */ 
        coverage_0x80b19128(0x4a47b55d116a634208052f4526b6048416c0742591d53bc32b1dea976c274059); /* statement */ 
ISchainsFunctionalityInternal(schainsFunctionalityInternalAddress).deleteGroup(schainId);
coverage_0x80b19128(0x83da8a6b3f39e3f6e91158d6f478a9e50cd24725f06ba5e9d3b01b68103bb776); /* line */ 
        coverage_0x80b19128(0x57abc1f56e5aac32bb763287c1d32bbf0c58a7229f9068489f3ca5360e68ac37); /* statement */ 
address from = ISchainsData(dataAddress).getSchainOwner(schainId);
coverage_0x80b19128(0xce2454deef748dd284b8d9745a9cb3f886c1362736e0de22ab61c051e4219acf); /* line */ 
        coverage_0x80b19128(0xd673c19f9db0572c8cf91c9fb7611ec50630f45d526583ee746319ce199e9b96); /* statement */ 
ISchainsData(dataAddress).removeSchain(schainId, from);
coverage_0x80b19128(0xcf566aab42f303052f46f153533af2c5dbc6f04546650d8036360daad976c51e); /* line */ 
        coverage_0x80b19128(0xceac7765bb55fca46e23191776cd26355ce839c1ef21809c15555a91f72728c8); /* statement */ 
emit SchainDeleted(from, name, schainId);
    }

    function exitFromSchain(uint nodeIndex) external allow(executorName) returns (bool) {coverage_0x80b19128(0x55d203a977c6c74935a955a7c7afea1a425c884a8fa3b3f72b0f1b8c70bb86d1); /* function */ 

coverage_0x80b19128(0x6c0afc665a95e0a61b92f81f2c6a0f9a5536fc152ff15b8ae6f82814b293f146); /* line */ 
        coverage_0x80b19128(0x930f807e5f1745d4a5e65f08cb6ab644059a86958eb183f32ffc7007a1bc5765); /* statement */ 
SchainsData schainsData = SchainsData(contractManager.getContract(dataName));
coverage_0x80b19128(0x3adb6ea431dab8d43d3f14ca8fba81e4007ca5ab1bb5679f25f5dba58e735ec0); /* line */ 
        coverage_0x80b19128(0x247e07122be80977a48ea83edd7e7ea6b4052d0103fb12c947dfd02b6f6b769c); /* statement */ 
bytes32 schainId = schainsData.getActiveSchain(nodeIndex);
coverage_0x80b19128(0x7e85cdf6a97a0d38eeee72855c1086388a5e33652fc243b0841364b9ec2997c3); /* line */ 
        coverage_0x80b19128(0x1c8bb078d8918781a74242db0be6773036c9c18227b539242fa0fd054c5117eb); /* assertPre */ 
coverage_0x80b19128(0x1d4a4aa46d3b9d3191a2ff583a369c82217cad845a254a4e0c154936b00de63b); /* statement */ 
require(this.checkRotation(schainId), "No any free Nodes for rotating");coverage_0x80b19128(0x8869e6656ebfc8d78d46b965ab33dd9892e20b124a9c89c72e3a6976b3e4e970); /* assertPost */ 

coverage_0x80b19128(0x13dfbb031688d5bdc7d2d91ac0eb7466f2047e513fbfb9d8294d19cf6e1b2bac); /* line */ 
        coverage_0x80b19128(0x94254b538a9eceb4d9ca28dfc68892c20af388194304eedbb0df65255efb6fa5); /* statement */ 
uint newNodeIndex = this.rotateNode(nodeIndex, schainId);
coverage_0x80b19128(0x36f19c2ee783476e156b648172c1c4bb24963bcce2a524f59ed56ba10c10d29b); /* line */ 
        coverage_0x80b19128(0xe83a82544811128e4bb8e6b9857a26a23affdd1b9e88d34459dbe936f346e841); /* statement */ 
schainsData.finishRotation(schainId, nodeIndex, newNodeIndex);
coverage_0x80b19128(0x7353d0ea257df51e3978ed60fc41ececf3c292c52589204d3a27184cc3456eb1); /* line */ 
        coverage_0x80b19128(0x3d7fbbd65f8df523e429b1666fc950813f971f49584a03100ae88012e0f13f01); /* statement */ 
return schainsData.getActiveSchain(nodeIndex) == bytes32(0) ? true : false;
    }

    function checkRotation(bytes32 schainId ) external view returns (bool) {coverage_0x80b19128(0x63035c86c876f3414374eaf3c8d328b800991aa2b918c1f02851c94845b22cbb); /* function */ 

coverage_0x80b19128(0x2eb74ddc4fd8eecb31e6239e35c877dbfcffdab49eb596708241d598705b59b9); /* line */ 
        coverage_0x80b19128(0xf090d28b24bc2511b161d499186d7b1f67da1ae1694881a603037ba3c05a1d09); /* statement */ 
SchainsData schainsData = SchainsData(contractManager.getContract(dataName));
coverage_0x80b19128(0x75a3f80b5793d1ef6386e467c42e0f946afe83c622f44e837a7b4bdd2d0085b8); /* line */ 
        coverage_0x80b19128(0x3c9bfcee46fb6646e47589f9cb529cce25296d78a767e43c48b1e1cc373d8320); /* assertPre */ 
coverage_0x80b19128(0x7a9116c990c4fce88e6feb332543c64e04958e37f160c063df427c6b20cbc62c); /* statement */ 
require(schainsData.isSchainExist(schainId), "Schain does not exist");coverage_0x80b19128(0x00c10b0a66ad23753456c139f707dc710c16cadc01e8d989bef324232428b151); /* assertPost */ 

coverage_0x80b19128(0xdd10757d1fb367516f15ecd3ae91565ad32611a3f32d45d7340888e1297952dc); /* line */ 
        coverage_0x80b19128(0x93001c9c36406da8ce36fa5b320a30536d6707789d48044069622e67e5ef5efb); /* statement */ 
SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            contractManager.getContract("SchainsFunctionalityInternal"));
coverage_0x80b19128(0xa1643cc615e128fa20ef81cc6e12a60723dfe1a9043c63298533193ea0f38e01); /* line */ 
        coverage_0x80b19128(0x0c918d263f2f77052d5648e5a7a991c01556397e4e44ba985347de93b831cf08); /* statement */ 
return schainsFunctionalityInternal.isAnyFreeNode(schainId);
    }

    function rotateNode(uint nodeIndex, bytes32 schainId) external allowTwo("SkaleDKG", "SchainsFunctionality") returns (uint) {coverage_0x80b19128(0xbbfe7e6b8d4abe94efdab119c755fcc94d9fc09c78251260c14d4377a8f13598); /* function */ 

coverage_0x80b19128(0x4d74f62ee2b1a943fb7cda213c8f31a42ae9eedc72d95e9c5ea68bad72c329bf); /* line */ 
        coverage_0x80b19128(0xa14601092aced460f61f412ee20ab6ded093704d54c9268b884c630c4766b6e9); /* statement */ 
SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            contractManager.getContract("SchainsFunctionalityInternal"));
coverage_0x80b19128(0x8aba75748a2b172f52c0a890985da81fcfebb172927944258d0e3c9db4ec679b); /* line */ 
        coverage_0x80b19128(0x1e9c4175cf4dc9bd804db0dfd94a0043c91ae04b03113d747f8157b622d4de91); /* statement */ 
schainsFunctionalityInternal.removeNodeFromSchain(nodeIndex, schainId);
coverage_0x80b19128(0x8bab65dd300fac1d3334fa25986df2dd6db5afcc413b9b45c272918349e1e011); /* line */ 
        coverage_0x80b19128(0x23265cfcd187a2c1ff3609269e75c1a42dde733246fad1dc873f363584c217f4); /* statement */ 
return schainsFunctionalityInternal.selectNodeToGroup(schainId);
    }

    function freezeSchains(uint nodeIndex) external allow(executorName) {coverage_0x80b19128(0xaaf8eb6ca63877aba3fad518bbe23507402a787d776161edbd62056531b1aa6e); /* function */ 

coverage_0x80b19128(0x6d5943e7205d9dce92199d462c99a86b731244639e933de02d64c7bd5e2f7087); /* line */ 
        coverage_0x80b19128(0xe1bb0526669a995cf226485b885634e38f301d9b362d515aba4c588fb63b0565); /* statement */ 
SchainsData schainsData = SchainsData(contractManager.getContract("SchainsData"));
coverage_0x80b19128(0xfc00e719d431cc0609298aa0de503214fde66a7eedbe86d48831e83538a0f818); /* line */ 
        coverage_0x80b19128(0xfe1ca4ee02a4acea932df1f00d20c69697bb449da0d0bb00f632d89f484d626c); /* statement */ 
StringUtils stringUtils = StringUtils(contractManager.getContract("StringUtils"));
coverage_0x80b19128(0xb1482e3ebd42c154abe2033f1aec17dd96219b403cc37ed93fee6df5e12a840b); /* line */ 
        coverage_0x80b19128(0x7891d4d02ded9bce1e9cdc331255b7a343df92b700af9bec3f2d288ae0c28276); /* statement */ 
bytes32[] memory schains = schainsData.getActiveSchains(nodeIndex);
coverage_0x80b19128(0xcb10002ddb20dd6a35cd67f03f094693df5c3b2fea10cfb397e3e711fa527780); /* line */ 
        coverage_0x80b19128(0x1e8d90dee1fe0e66b0acfdbba5cb3f086c4d94e8292d61bc99546e3050104c5f); /* statement */ 
for (uint i = 0; i < schains.length; i++) {
coverage_0x80b19128(0x01ad0a8b2d1f0cb98a84e505a0ed4c90fe32e63f91346b87a8e976d7a6204e18); /* line */ 
            coverage_0x80b19128(0x5c5166df6416c1f5676e36d879f7d03f1ff536789c1610eb0c3dc9640d9d733a); /* statement */ 
SchainsData.Rotation memory rotation = schainsData.getRotation(schains[i]);
coverage_0x80b19128(0x9bb9e01b97c2bd0d719dbee892752ca20ea44f6a0a838842de9042df88ccfd01); /* line */ 
            coverage_0x80b19128(0xfa856682af4960b5be1f1409156c806a67e2ec06327274e30e9b63ea87dc74e7); /* statement */ 
if (rotation.nodeIndex == nodeIndex && now < rotation.freezeUntil) {coverage_0x80b19128(0x0ae3ced1f17fdb8e876bc464cd1236e4df05adf10f7c841fad5319e5a15002be); /* branch */ 

coverage_0x80b19128(0xc2abc7465b2f4cac4a8207494fff01c41d4ef91fdf187d15dbbbe436d68a2f2a); /* line */ 
                continue;
            }else { coverage_0x80b19128(0x0b1582957ff772db4e7907ab26c35c0574edbb5a76c99c580f3cfe3d938077b6); /* branch */ 
}
coverage_0x80b19128(0xc23c0e3db801d5d08e04dde7c2325e79808ef53b1a2ce12f65009e7a4940a307); /* line */ 
            coverage_0x80b19128(0xc16ec58ab577872143461f7c0a77f60c53f95200036a3d238e2ef1c76650eefc); /* statement */ 
string memory schainName = schainsData.getSchainName(schains[i]);
coverage_0x80b19128(0xbe8e689efb1ca6b7a24525e976ddef3620aa152d86636e9353e0050bf3bd8589); /* line */ 
            coverage_0x80b19128(0xd5c9f4e967d0d20b5fe739f173d1afd19c81f0a5c2381a6a5d6be26704dd455a); /* statement */ 
string memory revertMessage = stringUtils.strConcat("You cannot rotate on Schain ", schainName);
coverage_0x80b19128(0x1990912ad7af733872123cf1f4dd8e4abe1cd09ca812035e9afc1a0816bc6389); /* line */ 
            coverage_0x80b19128(0x8c5ee5007613faaf844622e4909aa17cd879df1cd6a5fe90562a3ecd062b661e); /* statement */ 
revertMessage = stringUtils.strConcat(revertMessage, ", occupied by Node ");
coverage_0x80b19128(0x086fa7f3d11500b542d35b003df619b4eb9915851d3d7fa78dcb93307add480a); /* line */ 
            coverage_0x80b19128(0xdca764df9ebee5539ccc246fe577274c6a5448cd9cdbf3d3ba829caef9921a81); /* statement */ 
revertMessage = stringUtils.strConcat(revertMessage, stringUtils.uint2str(rotation.nodeIndex));
coverage_0x80b19128(0x8db26fff9c2ecd2c93d33c3641c46330fc0367496575436618228c4f6cbd234d); /* line */ 
            coverage_0x80b19128(0x82c4d1413026a1f77dcccd06d8e0fbe59752f3cafe2c6fadd78577b4f33530ff); /* assertPre */ 
coverage_0x80b19128(0x471eba378a2d68f50b565c33062dc03bf9f512537d0fff41abad3d799e434dee); /* statement */ 
require(rotation.freezeUntil < now, revertMessage);coverage_0x80b19128(0x1fe81663708db6a2ef18b3358196d61275d672745186f42eacaa44cf8efacdeb); /* assertPost */ 

coverage_0x80b19128(0xdb377e3f75f8e79c521143689864d1b4490a5c92e15085adfb6ace3549823f29); /* line */ 
            coverage_0x80b19128(0x78c15d71a95040f1e4fc62e206d8d97ed8034efb06014a3128fcadab245d32c1); /* statement */ 
schainsData.startRotation(schains[i], nodeIndex);
        }
    }

    function restartSchainCreation(string calldata name) external allow(executorName) {coverage_0x80b19128(0x0ee27d59bd9e9b077397d49e92effc0bad5b85fe5211a6a1b1c46a07f4e30f5b); /* function */ 

coverage_0x80b19128(0xb8a1d48f272374e18f125312e4f7d8a21bf9ab9ca55ea20bf7342f3aca7af751); /* line */ 
        coverage_0x80b19128(0xcbb7899ecd3d32c99a7ed5fa9c213bcbddd425a459889c514db5c3da5e2cf555); /* statement */ 
bytes32 schainId = keccak256(abi.encodePacked(name));
coverage_0x80b19128(0x4d7e5ed1e8e14b36fa21fe54c8365777123ebcd26d64f26dfec6f55417dd11f0); /* line */ 
        coverage_0x80b19128(0xf9c94be6c88fd68ba1ffd0b7b8ec2c82bae5bbb655457d5e46ec14f3d47690a4); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0x80b19128(0x09bbaf6cf859218e46f0698fea5d1b87666654c912fc5b26a17028f93a4ce72d); /* line */ 
        coverage_0x80b19128(0x6ff8d0cfc55e7c512479a3df2015aa0c136b7426d8c6b23e187877793368d331); /* assertPre */ 
coverage_0x80b19128(0xe2d7b543bd7bc7a3279dcf92c5a5ecdfcb37b7065201119c510cc939146d7583); /* statement */ 
require(IGroupsData(dataAddress).isGroupFailedDKG(schainId), "DKG success");coverage_0x80b19128(0xae2122ddb84bf951b0964343910a13e4e2568f670dc441face600390fb5b6726); /* assertPost */ 

coverage_0x80b19128(0x5ebca64105f390bac4214b6dbc3bda1534ed935c7feff6850c6330d58dcda6bc); /* line */ 
        coverage_0x80b19128(0x616836dc9030bd847a51c691aff6c85260893bbbd60cd2971dc3be6827960550); /* statement */ 
SchainsFunctionalityInternal schainsFunctionalityInternal = SchainsFunctionalityInternal(
            contractManager.getContract("SchainsFunctionalityInternal"));
coverage_0x80b19128(0xb840bef63a6f3daf0555e46c8656532b8d797b9a94e25b11ad4c7e1610576176); /* line */ 
        coverage_0x80b19128(0x88437e027ea445f596799a621606eb37805ad857bba99751788ae6c648db3909); /* assertPre */ 
coverage_0x80b19128(0x7c03ad01e4acf45c80fe1e955e276b26bb21737beef247d1f4e0e2bc4d8126c4); /* statement */ 
require(schainsFunctionalityInternal.isAnyFreeNode(schainId), "No any free Nodes for rotation");coverage_0x80b19128(0x23a9b7a1537960d5127142432beed89995f23d3c22365565929eb562fe9653b7); /* assertPost */ 

coverage_0x80b19128(0xdd3fda040cff4bfd847c37cc3406d7d1c22553c00c00ba72998ff95dfed74788); /* line */ 
        coverage_0x80b19128(0xb8b8a40b1b91e0995520ac27ca7198c81d3e43efc77364d3ddbff35a4502bc67); /* statement */ 
uint newNodeIndex = schainsFunctionalityInternal.selectNodeToGroup(schainId);
coverage_0x80b19128(0x0b9c6876e5f8b1b76d61d0918ea2e814d8c71297a43f09b416a8fab225656faf); /* line */ 
        coverage_0x80b19128(0xc4192ec92e2fbec7ec985bc25b0f85945f3c1cfd14706fbf6b2ec4d62f16a1f7); /* statement */ 
emit NodeAdded(schainId, newNodeIndex);

    }

    /**
     * @dev getSchainPrice - returns current price for given Schain
     * @param typeOfSchain - type of Schain
     * @param lifetime - lifetime of Schain
     * @return current price for given Schain
     */
    function getSchainPrice(uint typeOfSchain, uint lifetime) public view returns (uint) {coverage_0x80b19128(0x6f2753dfdce9e9f42b4e636afea2e5bcb51063259cfef2504e8f6efb917b7100); /* function */ 

coverage_0x80b19128(0xa0a46c7ccf079056a3763a0cfdb6aebbe21a304492ba11dbdd3c0dd243110d66); /* line */ 
        coverage_0x80b19128(0xdc0344785c8d4b302bfc9a361eb61ea8ec89b675e9cafacbd27b70144e9968d3); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0x80b19128(0x16bb9b14bcb88d9f86a4050b274991cf09ffd389d89e6d4d01ed8b834dbb4917); /* line */ 
        coverage_0x80b19128(0xcd8af9959615291d53ae42171ffab30646c1edc87aabf8eabe87350b07525d13); /* statement */ 
address schainsFunctionalityInternalAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionalityInternal")));
coverage_0x80b19128(0x53821d6c27881040cb902b137018a7504361b3231fa1edbc959b40e2c95ca4cb); /* line */ 
        coverage_0x80b19128(0x70b4ebb0bc8ed0d3a9633c001df3ee5dd4cf3dfeb18e747f729c329d1733853e); /* statement */ 
uint nodeDeposit = IConstants(constantsAddress).NODE_DEPOSIT();
coverage_0x80b19128(0xbb3a553216f1e771380a87f44bcba5c47e5d83604d06f5604331b276408cce2e); /* line */ 
        coverage_0x80b19128(0xf500d0d13a53b314287be0e6b30097673c79f0641c6d40152f72b7ad194ec0a5); /* statement */ 
uint numberOfNodes;
coverage_0x80b19128(0x608e13e0553a49c6c5c047badf818c0d8a6813149dbd746bf8c07555f2594fd0); /* line */ 
        coverage_0x80b19128(0x88241ff913edfd192377fc3741868f1c3fdb3ebfd974a2f3e31077e3b6482f92); /* statement */ 
uint8 divisor;
coverage_0x80b19128(0xca85caa5bb11f8bdaa5f477dd36e12aab8fa0970a4ded84caf3e0f7905a82119); /* line */ 
        coverage_0x80b19128(0xa2f29d2623e38fed2c6ef142bd910c950c98da5b1f195363dc71154277d80a47); /* statement */ 
(numberOfNodes, divisor) = ISchainsFunctionalityInternal(
            schainsFunctionalityInternalAddress
        ).getNodesDataFromTypeOfSchain(typeOfSchain);
        // /*uint up;
        // uint down;
        // (up, down) = coefficientForPrice(constantsAddress);*/
coverage_0x80b19128(0x1f9e5877d901eefbecea5735dc2006cf25c20b0da042b3bbc09c6ee192d5c98c); /* line */ 
        coverage_0x80b19128(0x035813faa6264669fda8e7cb52d3538d2d7cd453c19ba9354949c32d116993f3); /* statement */ 
if (divisor == 0) {coverage_0x80b19128(0xf41383923b3a28e27431648ee3e3d8f726e035f5e2b675f5bef3b909b8359c41); /* branch */ 

coverage_0x80b19128(0x0e72109c8cfd5fa87415c0b5a1968876afa8d7ff68b81a88e2c638a3dc6f24a1); /* line */ 
            coverage_0x80b19128(0x9b3dc040a1e2f8f7cfd5b7d959eb856dc2519d8f86171b9c8d953676b2a8252a); /* statement */ 
return 1e18;
        } else {coverage_0x80b19128(0x0ff78b68b8cfe46a458772f4582922d2ff16b1b33b7ab9c70183d3339ca6cea1); /* branch */ 

coverage_0x80b19128(0x02b5323b5a654304afc7917bde4c41fe6a56dac77ee6e6d49746aa9c3def0f0a); /* line */ 
            coverage_0x80b19128(0xf6423a30406bb29386be0c67e11c29984158bca0de87745d710372748aebb96f); /* statement */ 
uint up = nodeDeposit * numberOfNodes * 2 * lifetime;
coverage_0x80b19128(0x321da168afee7173784b41d87f694af8afdef35bcdafc8f6d84a9e2576387238); /* line */ 
            coverage_0x80b19128(0x92d830c50556e76746091a287846e3937c1700566b590ff2d319b73a6efede3d); /* statement */ 
uint down = uint(uint(IConstants(constantsAddress).TINY_DIVISOR() / divisor) * uint(IConstants(constantsAddress).SECONDS_TO_YEAR()));
coverage_0x80b19128(0xf4d36f0e66e2da2ea14a0108aec3354e8237ea210a218723b8eff8dcd0aae4c4); /* line */ 
            coverage_0x80b19128(0xdf914ef4c10dfb9da7373dded90771b6e5f70247bf61e8a05596f286e109b5c0); /* statement */ 
return up / down;
        }
    }

    function initializeSchainInSchainsData(
        string memory name,
        address from,
        uint deposit,
        uint lifetime) internal
    {coverage_0x80b19128(0x3a2d420086ad80b6664398071aa3a6e9b048b4f4a59b44e5cb74a994fc739c35); /* function */ 

coverage_0x80b19128(0xe0bcbcf85b88f3e4a571acaf04c5a5d38a7020a93bde4070641a2b79f51e3132); /* line */ 
        coverage_0x80b19128(0x1faeef7110af41a2e6d7a641f7e88ec3bfca51f598890fad2ba67cf327348014); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0x80b19128(0x25ccade1ea7309c53c1ff6b09182bf59d1a50d6f932a267a5f2adf6b68c64e5f); /* line */ 
        coverage_0x80b19128(0xd550301cc1b602acda052e0938e32fb8d276d89c2ab83b04cf6b4e3e1a5826a0); /* assertPre */ 
coverage_0x80b19128(0x2c6ad473b8b1e6467d9a10d55d516a6ea74960f49683edc6e1afd715776f525e); /* statement */ 
require(ISchainsData(dataAddress).isSchainNameAvailable(name), "Schain name is not available");coverage_0x80b19128(0x04366740e7703b21ab27219370253cb744baf809222d7f835cf141d5bf6d67c8); /* assertPost */ 


        // initialize Schain
coverage_0x80b19128(0x1ca2343d66fa4301ef19a3a3a4445125ee232ca6dc7926db1aaa8a292aa9fe8e); /* line */ 
        coverage_0x80b19128(0x1507910e1b8e499c8fc45bd90e8092ece45a1462f78fd9b7b8abf736942cd5ba); /* statement */ 
ISchainsData(dataAddress).initializeSchain(
            name,
            from,
            lifetime,
            deposit);
coverage_0x80b19128(0xb663954e3be4a0ec45b3b14d0881fce71d3e310004ed95d7d49d8a4984c0ccc7); /* line */ 
        coverage_0x80b19128(0x2a87d6c55d002620303439f9f12b92b41e5f28e549fd4c7bbe77c022a2bf1402); /* statement */ 
ISchainsData(dataAddress).setSchainIndex(keccak256(abi.encodePacked(name)), from);
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
        internal
        pure
        returns (SchainParameters memory schainParameters)
    {coverage_0x80b19128(0x9d84a1d38cadd6e8d24fea9a0fd91bb75be134cfaa88c204c79adf0b63d100c5); /* function */ 

coverage_0x80b19128(0x5f250f17ba42d0a67c5264c979c879d797aed3610780cd8f4b4e63de3a9d8fc5); /* line */ 
        coverage_0x80b19128(0x1e69c92a45796be011f434dcdd60dba74a5e51d8a74f49ea4e5856fbc1f58fbc); /* assertPre */ 
coverage_0x80b19128(0xae58afab6c2d84fb05b42e852063b7885e012bc987781a4747b021bcb5f18aaa); /* statement */ 
require(data.length > 36, "Incorrect bytes data config");coverage_0x80b19128(0xd6303075a6652300d960fb812830e4f33afb1cee3ac3201008fe3004160923aa); /* assertPost */ 

coverage_0x80b19128(0x464625ae66eb2eb517ae37cc6e85f4ad00644634be15c698adeda2468cd81eb7); /* line */ 
        coverage_0x80b19128(0xd24e18d7b030d5f0507bded77819c061e7bb5857105b6dcb97f7d3178a60b233); /* statement */ 
bytes32 lifetimeInBytes;
coverage_0x80b19128(0x7598e9948d9c7ade36faf441e5258e9f3227632f88ea6769c9f914b485ccffcf); /* line */ 
        coverage_0x80b19128(0xdbbf9e496de27248bc0656ee251b0495f70ef54f4bd136e4961ef602991cdef0); /* statement */ 
bytes1 typeOfSchainInBytes;
coverage_0x80b19128(0xc28b9cf4cccf90ef86260e3341cb8088de66a69d11b2b73b64e40424e7a12917); /* line */ 
        coverage_0x80b19128(0x7eec3eca8416d1cd0c3591c35496bc975daf4d40ac20b7910ef8ec9ddff361c4); /* statement */ 
bytes2 nonceInBytes;
coverage_0x80b19128(0x530d02795cd727385ddca56d896cf455c3c1c76335c7a4ceb3278ed9539c87d9); /* line */ 
        assembly {
            lifetimeInBytes := mload(add(data, 33))
            typeOfSchainInBytes := mload(add(data, 65))
            nonceInBytes := mload(add(data, 66))
        }
coverage_0x80b19128(0x5a48bcdfe8518508ce6ff84a9f9350f91ae70ef6208a6c0117e10a159e0efde9); /* line */ 
        coverage_0x80b19128(0xd566863cac165027bcd8f9ffbfbebc55d1616304012f65d9004634f5df54015a); /* statement */ 
schainParameters.typeOfSchain = uint(uint8(typeOfSchainInBytes));
coverage_0x80b19128(0xae0ed0bdcf4ae66f56b53aaf7d2828f292c69f160d30ca3a97fa83992e59c6bb); /* line */ 
        coverage_0x80b19128(0xa7b2d31f0a8b3411ff3215e8aba74f1b10be09e14085f9f2960965c2b03e1cd0); /* statement */ 
schainParameters.lifetime = uint(lifetimeInBytes);
coverage_0x80b19128(0xb3ad836e551f816cb341737196856b9c2ef5b69a18f8d1f47c8fe8b537ee2732); /* line */ 
        coverage_0x80b19128(0x39c9323bee54e8ebdeb772f47b8194330bc78581cf560d922bc7a98d25ed2c55); /* statement */ 
schainParameters.nonce = uint16(nonceInBytes);
coverage_0x80b19128(0x87650f89db43865886f02d7e9cdfd7b28aa6e1e128bb8ab69c0d088d4a3e1c70); /* line */ 
        coverage_0x80b19128(0x54c145da902ef1e9bad3bbb2382fd48ea7a4019ecf8d72f6ac2a47ed1d2af113); /* statement */ 
schainParameters.name = new string(data.length - 36);
coverage_0x80b19128(0x257e70c7f4939c2fad73d576e2d3dfa4ffda5b72368cf2b2937392ec8b9becff); /* line */ 
        coverage_0x80b19128(0xa97087016765b666ff4a1e20122ba65abc75b267487fc45d70bbcb4533caad72); /* statement */ 
for (uint i = 0; i < bytes(schainParameters.name).length; ++i) {
coverage_0x80b19128(0x629507e4157f25daeb7f7e7d8ccf107f6c3c1d19c42c83a035d2835d77d3e60f); /* line */ 
            coverage_0x80b19128(0x94c54bc43c0417cf181838508768964ab7b857f686ff95cdb5d7d18599e2b3a1); /* statement */ 
bytes(schainParameters.name)[i] = data[36 + i];
        }
    }

    /**
     * @dev addSpace - return occupied space to Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param partOfNode - divisor of given type of Schain
     */
    function addSpace(uint nodeIndex, uint8 partOfNode) internal {coverage_0x80b19128(0x2d14ca2ceb1ba335782dca8eb5f4c20309f0e9cd6095aff1b2f79a3ce8ca6fdd); /* function */ 

coverage_0x80b19128(0x7be3375e3549009aecc9c40b5bc4d516d8d6e00414c7e1c5cdfc447c2e235e74); /* line */ 
        coverage_0x80b19128(0x63ccccfa16e53a218bc5e373d578e4bad09110e8e6a40349a6fb6fb14940dd92); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        // address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
        // uint subarrayLink;
        // bool isNodeFull;
        // (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(nodeIndex);
        // adds space
        // if (isNodeFull) {
        //     if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
        //         INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, partOfNode);
        //     } else if (partOfNode != 0) {
        //         INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, partOfNode);
        //     } else {
        //         INodesData(nodesDataAddress).addSpaceToFullNode(subarrayLink, partOfNode);
        //     }
        // } else {
        //     if (partOfNode != 0) {
        //         INodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, partOfNode);
        //     } else {
        //         INodesData(nodesDataAddress).addSpaceToFractionalNode(subarrayLink, partOfNode);
        //     }
        // }
coverage_0x80b19128(0xf69a7b087b8d54e71df70d6c895f54afe593a2d75e7cd88b74e3aff0a2415143); /* line */ 
        coverage_0x80b19128(0x17a46a1f70c671b321ae4d7b8033de7111c81299796b14f42a46f06de7a73a1e); /* statement */ 
INodesData(nodesDataAddress).addSpaceToNode(nodeIndex, partOfNode);
    }
}
