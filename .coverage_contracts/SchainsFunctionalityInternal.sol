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

pragma solidity ^0.5.3;
pragma experimental ABIEncoderV2;

import "./GroupsFunctionality.sol";
import "./interfaces/INodesData.sol";
import "./interfaces/IConstants.sol";
import "./SchainsData.sol";
import "./thirdparty/StringUtils.sol";


/**
 * @title SchainsFunctionality - contract contains all functionality logic to manage Schains
 */
contract SchainsFunctionalityInternal is GroupsFunctionality {
function coverage_0x70343aa7(bytes32 c__0x70343aa7) public pure {}

    // informs that Schain based on some Nodes
    event SchainNodes(
        string name,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );



    constructor(
        string memory newExecutorName,
        string memory newDataName,
        address newContractsAddress
    )
        public
        GroupsFunctionality(newExecutorName, newDataName, newContractsAddress)
    {coverage_0x70343aa7(0x6611310891a8b6615b7c97afd5a16b9f744700e2f58cacbdb6e301c8680f50bd); /* function */ 


    }

    /**
     * @dev createGroupForSchain - creates Group for Schain
     * @param schainName - name of Schain
     * @param schainId - hash by name of Schain
     * @param numberOfNodes - number of Nodes needed for this Schain
     * @param partOfNode - divisor of given type of Schain
     */
    function createGroupForSchain(
        string calldata schainName,
        bytes32 schainId,
        uint numberOfNodes,
        uint8 partOfNode) external allow(executorName)
    {coverage_0x70343aa7(0xc3a8080ddbece221ef4ec256ed1bb9f573db7068ec0847d54794bc9ead8aab44); /* function */ 

coverage_0x70343aa7(0x917dd8a9ef6aaa796e6e003223b4fb3789d5a66b72a90eecc8664c17cc1a3039); /* line */ 
        coverage_0x70343aa7(0x7cea9506f1c8197a4e724b5598b800bd5d3e97628d7396e87bc43e2ecf45b5b2); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0x70343aa7(0x3d81920de1af656a28071e305ecd223ee116309c498a005a2d1831d53174d94f); /* line */ 
        coverage_0x70343aa7(0xea4840cf766610573cc90ddef5faa5e9ba9afc1b303a4c29d510c2bb9669728a); /* statement */ 
addGroup(schainId, numberOfNodes, bytes32(uint(partOfNode)));
coverage_0x70343aa7(0x561c031bc907ad9a384cb824adce9cb926cd97b14573a127af1135d5ad840f50); /* line */ 
        coverage_0x70343aa7(0xe9f40a9bb384a4eff036ae9652aa20e3fe8d695d08440a299fc00dbe1ea6a3e1); /* statement */ 
uint[] memory numberOfNodesInGroup = generateGroup(schainId);
coverage_0x70343aa7(0x352770891da7c29b2844fe3dc06136b749858d90f29e79fcc88271384a358636); /* line */ 
        coverage_0x70343aa7(0x196d382707e5564112d9cc2cbea4c434594a1cf1a8a1583299dafafb8556f97d); /* statement */ 
ISchainsData(dataAddress).setSchainPartOfNode(schainId, partOfNode);
coverage_0x70343aa7(0x1a0c956b282c4e8f8c52da9fe82201414357ada7b02c229d3e027397ba0ee16a); /* line */ 
        coverage_0x70343aa7(0x714f8f1ec1f5950cee41a3a683c21ab77951071238a460a073b166a747c5ef21); /* statement */ 
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
    function getNodesDataFromTypeOfSchain(uint typeOfSchain) external view returns (uint numberOfNodes, uint8 partOfNode) {coverage_0x70343aa7(0x19f6985870b8287a72d955ef02ee211e1d85abda45f83d3b8f5d828ad6048e4d); /* function */ 

coverage_0x70343aa7(0xb58133fd1176c44635d4de85ad93fa823ee2c52d897547dac4f342aeda0282a7); /* line */ 
        coverage_0x70343aa7(0x506f54c8183f6785995444508627ee27c0d1e63a8884c9c195292022fc76828b); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0x70343aa7(0x8615bf361bb82b86e75ca72015a5958808627e7cf9d598a8621b6ec0a5184c53); /* line */ 
        coverage_0x70343aa7(0x277d6292784602b8e4270ba44d09c4a541eaba5a007ff64eb0eff41cc20794aa); /* statement */ 
numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_SCHAIN();
coverage_0x70343aa7(0xca894cfca21f42d78975c4ac6da6336ce6164843fb7137b5ad98c1ed16cd4989); /* line */ 
        coverage_0x70343aa7(0xab8b4af11389d870106200d17428df31cf162fdf0ce667eec5247c0bdd4dcfd4); /* statement */ 
if (typeOfSchain == 1) {coverage_0x70343aa7(0x7d815470a54cff7fe3899be01fff456de61ef6c488e546ca253c4b5eb2458dc1); /* branch */ 

coverage_0x70343aa7(0x798b861751209c204692f69a679e72644384a0d09b5cd81bbd3b845bb291d104); /* line */ 
            coverage_0x70343aa7(0x8aa650effe8c76c1aba77b0ec1c849c35c447a85fbe1c15bc9bf711827ba58b0); /* statement */ 
partOfNode = IConstants(constantsAddress).TINY_DIVISOR() / IConstants(constantsAddress).TINY_DIVISOR();
        } else {coverage_0x70343aa7(0xad44e74b4352888f0bbc387945682fb528278c174bce192e129c250f1b316bad); /* statement */ 
coverage_0x70343aa7(0x803d31fc2d9cb181a70f97e697a1ec51dce947cc37b5aceae14713b1a806b841); /* branch */ 
if (typeOfSchain == 2) {coverage_0x70343aa7(0x256563191cbe0c254f1b706af5b3914137677fde2f44919692b78b2935ace874); /* branch */ 

coverage_0x70343aa7(0x379248fb0ae67be719206943fb3c1288374fa581d225af161ee7a2c66897f9a9); /* line */ 
            coverage_0x70343aa7(0x1c3bd9eada87893ff137831dc3b3cd8491688e87b188bd79510b8ac6235bcf4c); /* statement */ 
partOfNode = IConstants(constantsAddress).TINY_DIVISOR() / IConstants(constantsAddress).SMALL_DIVISOR();
        } else {coverage_0x70343aa7(0xacf168057d71ee18ec5e54e3cb4c0ebde4aeab54cc256b5056c8cce82b8837d9); /* statement */ 
coverage_0x70343aa7(0xccba05267c553479741a94c0938156378e6d648ef025f454960b304981b916e1); /* branch */ 
if (typeOfSchain == 3) {coverage_0x70343aa7(0x9edb53d63769707cd9772b55b8cdbc242c0b49c23b6073048c8ac6595e01cbe5); /* branch */ 

coverage_0x70343aa7(0x55bfeb6f85fe389ba9e6284a9fdb648bb2cd04bd0a083f74311d593f065a4046); /* line */ 
            coverage_0x70343aa7(0x369195d048437b74a7ddc216854d5564aaff76ef63f563718ac18d06f8cdd19e); /* statement */ 
partOfNode = IConstants(constantsAddress).TINY_DIVISOR() / IConstants(constantsAddress).MEDIUM_DIVISOR();
        } else {coverage_0x70343aa7(0xec56bdd5766c10a79149643c33ca69a1be4e8a06f4d6488a0b0ade44ffcf6a76); /* statement */ 
coverage_0x70343aa7(0x117891e891b164731830a7ec124ecaa9371387e1765f9ca08f035f1d15e34b90); /* branch */ 
if (typeOfSchain == 4) {coverage_0x70343aa7(0xe1879e28f3c2be25b86b15342f3e5c1890a12deb363c8bb700be58aa76ec7fc8); /* branch */ 

coverage_0x70343aa7(0x6263a5c9c3f0387959c7fe896ae06615695942e50f5c054f464bfdbcb83bd253); /* line */ 
            coverage_0x70343aa7(0xa6b2263508a5aa5c9ad5597061b556eb799a71d6db32179b6bb85b3939261128); /* statement */ 
partOfNode = 0;
coverage_0x70343aa7(0xd214fc2b61198c2e7a14a7512f93bbfa7a304a65f59ea910ff936ce47ac55c4d); /* line */ 
            coverage_0x70343aa7(0xc74afdbbee3a6819e55277c6f3a07ada6ad27229b6d01e875329c49b13018d9c); /* statement */ 
numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_TEST_SCHAIN();
        } else {coverage_0x70343aa7(0xad0946c03bfdd9007ea1a972e4358cbf7be6e70b6ead99299242d90d4af30631); /* statement */ 
coverage_0x70343aa7(0x6f62e0db4535e2ab916b0e8f5f63843814283604e0d43a07e75dec39065f5ecc); /* branch */ 
if (typeOfSchain == 5) {coverage_0x70343aa7(0x0fb9e6c07e99bd1f3bd1e2de6d88b015ee9c0e7822f163c351b9054174fc507e); /* branch */ 

coverage_0x70343aa7(0x3d545c024c6abb84ed727ca38b016e601634ff5ef57d233443682b72824f8939); /* line */ 
            coverage_0x70343aa7(0x9b60c86cc90c91809ddeb2691b423336a4a71bb195e531df2929920453b618b6); /* statement */ 
partOfNode = IConstants(constantsAddress).TINY_DIVISOR() / IConstants(constantsAddress).MEDIUM_TEST_DIVISOR();
coverage_0x70343aa7(0x145689695cb07b90c3ad99bf326304d56dcfa2b2f84cddbc51a7d8f24c12a858); /* line */ 
            coverage_0x70343aa7(0x2a104a223d662df1e0bdcd628d6a28b707121ff03f4a47eee0843723de1bad86); /* statement */ 
numberOfNodes = IConstants(constantsAddress).NUMBER_OF_NODES_FOR_MEDIUM_TEST_SCHAIN();
        } else {coverage_0x70343aa7(0x595678fc34b5cf5f64041bceaf2c973dfeeaa5eefaec20f99b94e1ef5ab01517); /* branch */ 

coverage_0x70343aa7(0x9ca6be37982cb503111598b580486be9f70e6616d885cac0a725b38f16a27e57); /* line */ 
            coverage_0x70343aa7(0x75d934b453f310218ebcdf1ec705ffba6b0a7356a2e38c22b71db220d6ca2bbb); /* statement */ 
revert("Bad schain type");
        }}}}}
    }

    function removeNodeFromSchain(uint nodeIndex, bytes32 groupHash) external allowTwo(executorName, "SkaleDKG") {coverage_0x70343aa7(0xb39795110a34d3f19a948a852b574612fbb609640437eafc4848feedcf846ed4); /* function */ 

coverage_0x70343aa7(0x58119789c8b0668332f777913589c8e26c4feca6d8437f9d492e790980e40a31); /* line */ 
        coverage_0x70343aa7(0x26638053a282bf2e2086e64185ff562525fcfba190d4dd633666bda96c666e16); /* statement */ 
address schainsDataAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
coverage_0x70343aa7(0xaf778f9257aaca28b9aa518bb3cd72a13fb25abd6c31105e58cbce98e32e2fa8); /* line */ 
        coverage_0x70343aa7(0x690c1903d84782a43e9c67c27b1160ae1ce0142fc2f07a72685f6afe105778e5); /* statement */ 
uint groupIndex = findSchainAtSchainsForNode(nodeIndex, groupHash);
coverage_0x70343aa7(0x9db5537914cd2e98ebd900e114fba715c2d32d7321ce4fecaefb9ad32b37e931); /* line */ 
        coverage_0x70343aa7(0xc8e0dac3207852e4c87584ec796fedf0301b9265b15d81b1e3aaa27c75e1c9e0); /* statement */ 
uint indexOfNode = findNode(groupHash, nodeIndex);
coverage_0x70343aa7(0x868ecc19777289689d951b54e27e3dcc03e19bd70c6286ee529ede7426d70811); /* line */ 
        coverage_0x70343aa7(0x8081e3dd83e7aa62d6a90cca2ee809abb5393ae2e62fd88e564a1b07ec1e7eaf); /* statement */ 
IGroupsData(schainsDataAddress).removeNodeFromGroup(indexOfNode, groupHash);
        // IGroupsData(schainsDataAddress).removeExceptionNode(groupHash, nodeIndex);
coverage_0x70343aa7(0x22bc74770dd47c1f49a9abf01ec0290234d094d8e13d00c46f1a3f30deea9641); /* line */ 
        coverage_0x70343aa7(0x985af832d075dd0cd1f0d7f8356c04268d3ac19bad99bfa6ac3f815cf2e90c72); /* statement */ 
ISchainsData(schainsDataAddress).removeSchainForNode(nodeIndex, groupIndex);
    }

    function removeNodeFromExceptions(bytes32 groupHash, uint nodeIndex) external allow(executorName) {coverage_0x70343aa7(0x694c112efda62f5cf78d9c98a4e9179babae278b9f571ee729c2637dd2125381); /* function */ 

coverage_0x70343aa7(0xf1f601e0285d1321ae4319ba21dae524e8921c6d7dbefa71ad483cf7f3288c21); /* line */ 
        coverage_0x70343aa7(0xd68482e71dfbed6600753f4bebeeea09f2ea3a944254288a6ccf291274a939f2); /* statement */ 
address schainsDataAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
coverage_0x70343aa7(0x5399159fc55fdea778dfe4cf00ba31f6a3a30405b2f5876c10e31e255eb7d301); /* line */ 
        coverage_0x70343aa7(0x3ff60f17c05fb34b234d8cc56bdef8cd25c62fb7958f169ec01997c214e56561); /* statement */ 
IGroupsData(schainsDataAddress).removeExceptionNode(groupHash, nodeIndex);
    }

    function isEnoughNodes(bytes32 groupIndex) external view returns (uint[] memory result) {coverage_0x70343aa7(0xbfa6929b1099f07253b2b0affd8192d1342c00c8b2e810c4df1c609a8033c21f); /* function */ 

coverage_0x70343aa7(0x27753a3e802acdf5ef7697046ea057360e2eb6ca9466c42487b846cc305adcd8); /* line */ 
        coverage_0x70343aa7(0x3e0cff73196e4c751d2da929c8f8a6f51fe352d9d7511aa7f28bf3e03e54de0d); /* statement */ 
IGroupsData groupsData = IGroupsData(contractManager.contracts(keccak256(abi.encodePacked(dataName))));
coverage_0x70343aa7(0xad222e8a2369332cabe1be2b92eaac8ea9a304c58e6bec41c39cf77d26a4547f); /* line */ 
        coverage_0x70343aa7(0x290741476c56c66614279dd71635bf45acacc59bb55b9da1cf190255544324f4); /* statement */ 
INodesData nodesData = INodesData(contractManager.contracts(keccak256(abi.encodePacked("NodesData"))));
coverage_0x70343aa7(0xe56541b998852c5dca411d9a669f53ebe652f7f2a70d94b256ce9fb40cf0d7ea); /* line */ 
        coverage_0x70343aa7(0x2a96cc8cf19816249cfc0094d40fc924390bc16b7b3756319ad7f83be19237da); /* statement */ 
uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
coverage_0x70343aa7(0x5da55f20398c02787315e7a04b6df649ebf98cf7d496cc9a551f67d5ae9e8d26); /* line */ 
        coverage_0x70343aa7(0xc0ab36026263d6c4a8ce8ce4b301502ca40fd0bf01d50418e498a76ec012aeb2); /* statement */ 
uint[] memory nodesWithFreeSpace = nodesData.getNodesWithFreeSpace(space);
coverage_0x70343aa7(0xb68ce63a6bc28fdb0836f3864d50bbf565813e373312c60feb6ead173c74d7f6); /* line */ 
        coverage_0x70343aa7(0x7d2d5e0ee55e75d7a4c000fc6433f1b13b7c93c3d86d86cb517ef39cfd88fa94); /* statement */ 
uint counter = 0;
coverage_0x70343aa7(0x35d6eb382faa377cea615fa4eea6f9d2d0ec89620a10a43f00188c7c78416578); /* line */ 
        coverage_0x70343aa7(0xf90ce93e1f490627a7ac1631d186a9938ad77f5bc38abd7560e148d0ed8022f7); /* statement */ 
for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
coverage_0x70343aa7(0x92c3944e67a399cf38bb5ce3d6a8eca04f141f231edd18fcd941d3cffb8fd416); /* line */ 
            coverage_0x70343aa7(0x870078e863fbde15deafb32419c8e846fbd40e100adce6f2486745135b8d1a64); /* statement */ 
if (!isCorrespond(groupIndex, nodesWithFreeSpace[i])) {coverage_0x70343aa7(0xbf24da0caaf66a376ce64adb30a550d54c03110b40d60f38098e5eb82cf59ce5); /* branch */ 

coverage_0x70343aa7(0x820ccedc6d2bceac947f67e8c50511ed539d8e411c8453f163e1c943ecdb4d30); /* line */ 
                counter++;
            }else { coverage_0x70343aa7(0x982e57042077bc24b3a363f945b8e0aec57323b58a1f0a0ad17c922d70df8ff7); /* branch */ 
}
        }
coverage_0x70343aa7(0xefbf782f87a36c2aa084b8b1c75167a671f93160ac76086a4da886f1a067e317); /* line */ 
        coverage_0x70343aa7(0xf216dbe3a59b6cdeee47cbe802da10b07dbd7b9209dc7af3d6310abf6772f0e0); /* statement */ 
if (counter < nodesWithFreeSpace.length) {coverage_0x70343aa7(0x2e3d4ac2d8752571a51215a569410109f4f6d81423bf006658fe0b9c4de0230d); /* branch */ 

coverage_0x70343aa7(0xe0c7d27f6089a09666cb84245b830d08fbb820429c8ae8f3238bb3fbe278a718); /* line */ 
            coverage_0x70343aa7(0xde93e967a40ff603adf2bfa5a4723ff2f7f93b75cd823bac694eedd9a043f6f9); /* statement */ 
result = new uint[](nodesWithFreeSpace.length - counter);
coverage_0x70343aa7(0x8a0c61fc06b25542b139ecffa6d3b397f66daa179e3a37b4e8e1a5d0122bade5); /* line */ 
            coverage_0x70343aa7(0xd24901494774c2facd3abf203ab5e35d57abffdd5970041ae2552785313d8354); /* statement */ 
counter = 0;
coverage_0x70343aa7(0xa2b4610b9a199bfd04efa60f8879e040b966d65bcd5d9be9b2c09503eda7ddeb); /* line */ 
            coverage_0x70343aa7(0x2c294e4d07aa96e109ab6fffd4133627b3011b6de63dad58cdcfbf520a7c1e7c); /* statement */ 
for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
coverage_0x70343aa7(0x65ceb4a6808b9b31f73f3e8404fc24b8fb825f274312e6860530706a21311bec); /* line */ 
                coverage_0x70343aa7(0x6d7ba9b069e00d4a5fdfb6de44e2ad2698b758cee6a0953661ba7f58f27febdf); /* statement */ 
if (isCorrespond(groupIndex, nodesWithFreeSpace[i])) {coverage_0x70343aa7(0xef3417c146a038e9cf60e062b39b453f6f941f9e7fa749b4206d12cbdde7b806); /* branch */ 

coverage_0x70343aa7(0xdd0d542a8d75cd0a0cd8ed237a982be9053c23ebd9aa3303e881ce60f22d2280); /* line */ 
                    coverage_0x70343aa7(0x830ee7c9636cd36ac4a4fdf897626d3bfcd97e67a3b9492eb8fba5c6b77205a8); /* statement */ 
result[counter] = nodesWithFreeSpace[i];
coverage_0x70343aa7(0x608860dfc09ad509120d7485654e9d24d8da129c1e508589da12517bda75f786); /* line */ 
                    counter++;
                }else { coverage_0x70343aa7(0x5a27b4c338f03f5f89c8a0f31caaa1f6de1df096fadc0ac842b5587d3d1331a2); /* branch */ 
}
            }
        }else { coverage_0x70343aa7(0xf19083055c93452bab1566852f36be34fb04e37203798b653946e9f6b66d85d8); /* branch */ 
}
    }

    function isAnyFreeNode(bytes32 groupIndex) external view returns (bool) {coverage_0x70343aa7(0x16d09b458c906e5b30bd701eb5fbbef04051ab61f7c73bbe22e612d6ec2a1917); /* function */ 

coverage_0x70343aa7(0x430056f73ab2727989227f4e7fa5ee0ed75701320fb48ea646abd6c794870b14); /* line */ 
        coverage_0x70343aa7(0x9c3ae9ff32dd85426b4516b442626abafe2cb455ec9f8f1755c370e5c4488145); /* statement */ 
IGroupsData groupsData = IGroupsData(contractManager.getContract(dataName));
coverage_0x70343aa7(0x95496b3f5904ac7bd91d1ef7b68a05be0bfe79db7b0fdecc3224ca9c14d353d3); /* line */ 
        coverage_0x70343aa7(0x28e8556ec93dfd480998e5777a045fcafdfbfc7b6382e16f445562a470b42f0e); /* statement */ 
INodesData nodesData = INodesData(contractManager.getContract("NodesData"));
coverage_0x70343aa7(0x9c7f573e92c1762891e556f06b4006b45ad2c642687a2debc986367dc7260081); /* line */ 
        coverage_0x70343aa7(0x95e8a4c8e4a2548e8d0aad9ac5b19c5389c073d2f021472af6094ca22438d5ca); /* statement */ 
uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
coverage_0x70343aa7(0xa9f5295ae0604b2d6b77429d451ab14f2f45005e124acee01c5a66da50679dc1); /* line */ 
        coverage_0x70343aa7(0x70ed5943b5c5c32717a9c8b717503cd2c9b466a70d994b8796e30bfbfbdbaa4a); /* statement */ 
uint[] memory nodesWithFreeSpace = nodesData.getNodesWithFreeSpace(space);
coverage_0x70343aa7(0x81b7c6e8e080b4f338ff3a9a4ab1e5bc815ead62f5bc6bdaf111b2f49c76423a); /* line */ 
        coverage_0x70343aa7(0x998edb1ad40b4778043788f15e25325a08da04220b252fee88d95c8e548946a4); /* statement */ 
for (uint i = 0; i < nodesWithFreeSpace.length; i++) {
coverage_0x70343aa7(0xfd78a9d91187dc5f3b59dcece3e1ba6877c8966f0ab3e2d8f7abdfe684923653); /* line */ 
            coverage_0x70343aa7(0x12b6b5a7f744db50e89ece476f0ea4cce5e5210fb5ac242fb17d581ac25c64e2); /* statement */ 
if (isCorrespond(groupIndex, nodesWithFreeSpace[i])) {coverage_0x70343aa7(0x3288e1e807d45a0c3d0b82e3191f137ddf50dccbe7364d3165e46b4d29d0c0f0); /* branch */ 

coverage_0x70343aa7(0x7c4a0783db1de2cabaacdaef5e4d13bbc52096218d4b870f9d86af4bf0dd9017); /* line */ 
                coverage_0x70343aa7(0x021d481e014c531c5fd43d92bac92d85d706972822b3463023c8ede3c5c13e6c); /* statement */ 
return true;
            }else { coverage_0x70343aa7(0x73241094a2aa5f98a0de998887d9dce2cd047d92647882ccdd4b133d1b50d943); /* branch */ 
}
        }
coverage_0x70343aa7(0x29abf494aae91f0941b6723b464b41323e689f928a53436178b8c3446f6d04ec); /* line */ 
        coverage_0x70343aa7(0xa6d1da2fb5aa219f2e935085759b665d0d71bf2913123c648cf421df6384a93d); /* statement */ 
return false;
    }

    /**
     * @dev selectNodeToGroup - pseudo-randomly select new Node for Schain
     * @param groupIndex - hash of name of Schain
     * @return nodeIndex - global index of Node
     */
    function selectNodeToGroup(bytes32 groupIndex) external allow(executorName) returns (uint) {coverage_0x70343aa7(0xc23ba8446dba1a68887e1027bc034117862dd4188b4dd93370fd19ed186ad4c7); /* function */ 

coverage_0x70343aa7(0xeffda2d41324e738e7ab25052674e37cd90b251249029c71d8788ae0f6cd293f); /* line */ 
        coverage_0x70343aa7(0x6f8d956a63e0326f46678fdd8b8b4f5f2a9df67382266c39f33df3c45496d4c9); /* statement */ 
IGroupsData groupsData = IGroupsData(contractManager.getContract(dataName));
coverage_0x70343aa7(0xf56dc6f2ed4c834a3685ac24a2d218975fe274712d4302b45a6df81f3bfdf87c); /* line */ 
        coverage_0x70343aa7(0x1433788ccb0b1ad1b8450e9da64dc3e405153175c460bde086d1f41530ca00ff); /* statement */ 
ISchainsData schainsData = ISchainsData(contractManager.getContract(dataName));
        // INodesData nodesData = INodesData(contractManager.contracts(keccak256(abi.encodePacked("NodesData"))));
coverage_0x70343aa7(0x0057a34c118fa918dd988bb33c285de93db22529740d2db4ce73f8758b193a89); /* line */ 
        coverage_0x70343aa7(0xb03130d7a1433333b9774e57129a7484372cc8bbd41d0a5604b4190177a8e011); /* assertPre */ 
coverage_0x70343aa7(0xbb69103f7fc15a89002c152227d6f4da90e331a551891920bef334546ead2da7); /* statement */ 
require(groupsData.isGroupActive(groupIndex), "Group is not active");coverage_0x70343aa7(0xa081fac89a6efd1afd19c48f6d1464eb9fdeed74d205ae75bdaab53d7fea48bc); /* assertPost */ 

coverage_0x70343aa7(0x0e2e37c9b5bf70a4dbc76827cdbedbf4f64e8427f5170dd89fef9cf9105099cb); /* line */ 
        coverage_0x70343aa7(0xae4e05e2a6efe705d24d0b18d4063affb64c04950fd1051922eafd06fc9087ef); /* statement */ 
uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
        // (, space) = setNumberOfNodesInGroup(groupIndex, uint(groupsData.getGroupData(groupIndex)), address(groupsData));
coverage_0x70343aa7(0x5bf624aca67b2ead1c75fb15e6d72915107b80b43f501fe5f633eeef174b35c9); /* line */ 
        coverage_0x70343aa7(0xdf7e1e33651299d23a35a7611f05c0432737b05be9d18f82cca63af2cd43485b); /* statement */ 
uint[] memory possibleNodes = this.isEnoughNodes(groupIndex);
coverage_0x70343aa7(0x5b088d1b76650b23c2445ab70b1391976b4501a2e3ae576f8d1a0cba739d9cea); /* line */ 
        coverage_0x70343aa7(0x73d26e3b2f6f906446d1d1f57bdfd433fd6e90c9c85a38019aa55b712e7c0122); /* assertPre */ 
coverage_0x70343aa7(0xe930b3a26d1f95350d79b01dca34d82c71c98d07ea8e2423ff0a85bc7341d93c); /* statement */ 
require(possibleNodes.length > 0, "No any free Nodes for rotation");coverage_0x70343aa7(0x41433ce0f089aacfa4bdb06340d341c657ab17fa492f5086f76ed21e68692bf9); /* assertPost */ 

coverage_0x70343aa7(0x7517bdcc4b1c0fe5dc45328c46e4be0e61094a101baf7172d1baa96856c622ff); /* line */ 
        coverage_0x70343aa7(0x5d9f9c906f4cf3848ccc543163e31de48e5ff3938158b62d21b373d24cdfb6ed); /* statement */ 
uint nodeIndex;
coverage_0x70343aa7(0x027014e06d01aed8812a7788bdb2daaaf83cea6edd6ad71f03004a9d2fe75a44); /* line */ 
        coverage_0x70343aa7(0x2e24518d908158f73e45a9363c3114fe62a6d78574acb8958b242da3bd56e7b1); /* statement */ 
uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
coverage_0x70343aa7(0xe2a055bea1bbd40f57b8b66e281b1a8565599bbf8370cbccc5070ae6f7787d31); /* line */ 
        do {
            uint index = random % possibleNodes.length;
            nodeIndex = possibleNodes[index];
            random = uint(keccak256(abi.encodePacked(random, nodeIndex)));
        } while (groupsData.isExceptionNode(groupIndex, nodeIndex));
coverage_0x70343aa7(0xb9cdf1d77ee10d9a129b0271de29cc7db2a969d04665440a256809fdad42a9b8); /* line */ 
        coverage_0x70343aa7(0x51c1bc7693e08da91690896da88450c029108215b97066080c4ed292c9daef94); /* assertPre */ 
coverage_0x70343aa7(0xb9e5088e8ee85c3516796775405045246e707e12c21c1aaee9938e30d22757aa); /* statement */ 
require(removeSpace(nodeIndex, space), "Could not remove space from nodeIndex");coverage_0x70343aa7(0x667f12079e219aee0f89105d62f215e0317c15691a568c53997cc674913e596f); /* assertPost */ 

coverage_0x70343aa7(0x267d71faea75a92f85fa5709753990f43372d2b40d2f006aebb1a15aa7c7aca0); /* line */ 
        coverage_0x70343aa7(0x6a4af5f2869f525f407161934a028640e50819e2c17d3471e8b1a965b226fafb); /* statement */ 
schainsData.addSchainForNode(nodeIndex, groupIndex);
coverage_0x70343aa7(0x7cfbd35b689be8bd84b548e6e6616e48730eb8c0aac544e22f67a94ca77e54ef); /* line */ 
        coverage_0x70343aa7(0x7848b0cf048f922cb3817c8817823f68e27bdcd15982cbfd19c7ef9a37508811); /* statement */ 
groupsData.setException(groupIndex, nodeIndex);
coverage_0x70343aa7(0xa663d82c7595f8e69e06526bbc965c66a77e9699cdd02197bc20d26cf5877910); /* line */ 
        coverage_0x70343aa7(0xea9f6bebf84bbe5662bc9a93144b97200e85be42b2c67765eeac9e2874632363); /* statement */ 
groupsData.setNodeInGroup(groupIndex, nodeIndex);
coverage_0x70343aa7(0x790fd84265e70cad24b78c926b574bb783c44a7ad8eb714e650a6a096ca41f5b); /* line */ 
        coverage_0x70343aa7(0x2afceb6c77283f8498fb77362043b395379afbab2d1825869c4536cce03340b5); /* statement */ 
return nodeIndex;
    }

    /**
     * @dev findSchainAtSchainsForNode - finds index of Schain at schainsForNode array
     * @param nodeIndex - index of Node at common array of Nodes
     * @param schainId - hash of name of Schain
     * @return index of Schain at schainsForNode array
     */
    function findSchainAtSchainsForNode(uint nodeIndex, bytes32 schainId) public view returns (uint) {coverage_0x70343aa7(0xf2a79c499bcf997930cb19d1d2a19fd39f35e808a050223826e3e4bcc4ee011d); /* function */ 

coverage_0x70343aa7(0xcad1b0e44d610cbb5dca7344b0490da6bba900650bc10bf3a5badfc41f218be6); /* line */ 
        coverage_0x70343aa7(0xe353e04ace20ad26ad5cda12b0bd991955fd657665f92c93c753ec837c0594cf); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0x70343aa7(0xb65e7c1a5af95a01577ecf02e96b9723d744667f32d35fc4476afc80a305f383); /* line */ 
        coverage_0x70343aa7(0x2fc55dba109dd85d3e0cae65608e02ea965359ae84ca26141945d4681ddb3904); /* statement */ 
uint length = ISchainsData(dataAddress).getLengthOfSchainsForNode(nodeIndex);
coverage_0x70343aa7(0x159c24c19e489082be1347c2e099f6b5988092f32478c3a65538c797fcd7737f); /* line */ 
        coverage_0x70343aa7(0x5c09aaf60a46e47e15fea0012df48ea2e40026abedb4b4e058964bb82faad814); /* statement */ 
for (uint i = 0; i < length; i++) {
coverage_0x70343aa7(0x0588e8d515f9f4ea47eb6dd4a4a9583cec845e840b3281acd5818b850ca8b5d7); /* line */ 
            coverage_0x70343aa7(0x1d13516a17d50529055fdfc58b68b22fba8ba86f0cca2a2174b7e0c0ebddf32b); /* statement */ 
if (ISchainsData(dataAddress).schainsForNodes(nodeIndex, i) == schainId) {coverage_0x70343aa7(0x3ccc24eb3897a0c002fb99ec4558f244d0212ae7ab6089092b5a2cfc97b7e878); /* branch */ 

coverage_0x70343aa7(0xec4a9d2bc41af7fd515dc3d938a076a74b0bb7dd59a2b289218d1cba5f52102f); /* line */ 
                coverage_0x70343aa7(0xcf34d6388cc40e71136766e9f0fe511cb81e1c290fbc65f3f318b97403a5c7da); /* statement */ 
return i;
            }else { coverage_0x70343aa7(0xcf409e9cd03895180f673f4e3635243aafd1b33a57a6c27e311daff28f0d8da7); /* branch */ 
}
        }
coverage_0x70343aa7(0x98022db4d355b9884fd02bea3fcb587472bbe2416a2462f4776c782670ebb3f2); /* line */ 
        coverage_0x70343aa7(0xc5b7e83344ad25b6ff66b0f132326a960160987e00e533bbb6f4cd35932e76b7); /* statement */ 
return length;
    }

    /**
     * @dev generateGroup - generates Group for Schain
     * @param groupIndex - index of Group
     */
    function generateGroup(bytes32 groupIndex) internal returns (uint[] memory nodesInGroup) {coverage_0x70343aa7(0xda8e71a60627c1ae07a071a63875c0af40d2ef2fcfdd8b2666cd4b2c1bb0d409); /* function */ 

coverage_0x70343aa7(0x897b27f5d185cb8c786d5f8328cd9588f38413833a9f211116f448d58e542299); /* line */ 
        coverage_0x70343aa7(0xd9dbe8175f7cd24be0ff74f871582955b1a93ac43f4b5a5c7d7a2efa64540312); /* statement */ 
IGroupsData groupsData = IGroupsData(contractManager.contracts(keccak256(abi.encodePacked(dataName))));
coverage_0x70343aa7(0x45ec30eb643a05fb3238b9aa5a4ad3a63861714a23911fc66d5e3d526e6fd945); /* line */ 
        coverage_0x70343aa7(0x0ec39be06ade4a006ab08467e497ce8faf6207960603b24aa5f1b8fef90f61aa); /* statement */ 
ISchainsData schainsData = ISchainsData(contractManager.contracts(keccak256(abi.encodePacked(dataName))));
        // INodesData nodesData = INodesData(contractManager.contracts(keccak256(abi.encodePacked("NodesData"))));
coverage_0x70343aa7(0x55c8a60b17bd0e9d3dface5805ac20109f6ca395cc49815ca7ca89fe69ef5cb5); /* line */ 
        coverage_0x70343aa7(0xff32656d36f4aee86af387f18a47d639c411192459f938a48b6940c9f8a0f81b); /* assertPre */ 
coverage_0x70343aa7(0x9bac919d0585c670bb5cf8e2ea94c8d1029de2db942a33f7f55d1414d3e5d3ad); /* statement */ 
require(groupsData.isGroupActive(groupIndex), "Group is not active");coverage_0x70343aa7(0x92fac9f6ab3e34c613ab10ede8056e2ddd705645893804fe918cb2b128245b8f); /* assertPost */ 


        // uint numberOfNodes = setNumberOfNodesInGroup(groupIndex, uint(groupsData.getGroupData(groupIndex)), address(groupsData));
coverage_0x70343aa7(0x4cc61e0e70752a5f263ab3e2944d58d9aeb492af05f199c5adf4476e212338d2); /* line */ 
        coverage_0x70343aa7(0xefd7d5d89fc62961ba8821bc76a09a49210587284aacfefa6137c1864a39f763); /* statement */ 
uint8 space = uint8(uint(groupsData.getGroupData(groupIndex)));
        // (numberOfNodes, space) = setNumberOfNodesInGroup(groupIndex, uint(groupsData.getGroupData(groupIndex)), address(groupsData));

coverage_0x70343aa7(0x257595cf4c7cdb3898b8ee6fd8e051876c2a401ff4c5010d736d4bc3e1de2bbd); /* line */ 
        coverage_0x70343aa7(0x4e1e2969cab93de1e0276a364f522290dc6827d7a775bb19b114b15481253dac); /* statement */ 
nodesInGroup = new uint[](groupsData.getRecommendedNumberOfNodes(groupIndex));

coverage_0x70343aa7(0x7fae294c3912030be88a3e8ebf47edadba291846688033ccc5369a2208dfbbb6); /* line */ 
        coverage_0x70343aa7(0x97b9715f1c447e04f7c11e22966e5aaf79adc9a4a7454e240d20af7d0001b7d8); /* statement */ 
uint[] memory possibleNodes = this.isEnoughNodes(groupIndex);
coverage_0x70343aa7(0xaa9f4de1a3fe7dff111228b90c910f9c70670889c9f528ab799115ec289b2a25); /* line */ 
        coverage_0x70343aa7(0x0cd2d9cfb0fb4a9378f66ceb4e48ceb6850581a787a4a90ca2272e093246fc95); /* assertPre */ 
coverage_0x70343aa7(0xdc6eaaf4bcd4eb49b0ad9aa31c7ebfa4894b129c7ac06c85f2315406e9b030b1); /* statement */ 
require(possibleNodes.length >= nodesInGroup.length, "Not enough nodes to create Schain");coverage_0x70343aa7(0x0a9ce59381e4a91966514bb2dbed689fdee9bf2ee3d0ec992bb812a5444f961e); /* assertPost */ 

coverage_0x70343aa7(0xcaf6e47a4dd1be2007f7531f19691797d5645b90a4e66f27a034934b79ebaa71); /* line */ 
        coverage_0x70343aa7(0x17bc9aa3dfdfb33beab77d117320da93f74cc7cd80005dbf83d03fcd38b3d991); /* statement */ 
uint ignoringTail = 0;
coverage_0x70343aa7(0x8e70403dfeca86dd4302256590ed868687d98c62655b662757039e86115c2ebd); /* line */ 
        coverage_0x70343aa7(0x08dc517063514a4bb9422bcd6b3044c588663f5580536f56655d11afc9eaba28); /* statement */ 
uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
coverage_0x70343aa7(0xa614da5e3339159d0d2e7f83ebc243f763cb4ab82a419b99f5272322490a07bd); /* line */ 
        coverage_0x70343aa7(0x716eaaf23b3b758f056b8b46ecffdabb768c6bb32823715564114e788e64ffea); /* statement */ 
for (uint i = 0; i < nodesInGroup.length; ++i) {
coverage_0x70343aa7(0xe5e6f7ef931870140b6282ad99bf8ecdc01d3b14d0a4229647545dc8ed9e561f); /* line */ 
            coverage_0x70343aa7(0x9b4d5ed56ffa1a4021a21620b57cc8b47954bd169a0c01fe27b3b67a73a3ffdc); /* statement */ 
uint index = random % (possibleNodes.length - ignoringTail);
coverage_0x70343aa7(0x8c2ddc6746c7eb7f6760bb13affba8785b457d878bc1008a5693fe3114730dd3); /* line */ 
            coverage_0x70343aa7(0xaba582c7316b177cb8b521f987093110dd722e0052dc5f644d4563ba221405cf); /* statement */ 
uint node = possibleNodes[index];
coverage_0x70343aa7(0x4bb7a00491047d7ac6c44203eb23855e69772809f35eb69496304dc97681791c); /* line */ 
            coverage_0x70343aa7(0x6a83980127987c74691bb4d8bf4235b7e2d2de75c80a0c2c568b42c48c997c58); /* statement */ 
nodesInGroup[i] = node;
coverage_0x70343aa7(0x4c0cabc3cadc25d360f787b5b161842346c1cc76b557d1054a610bcf6a0bcc7d); /* line */ 
            coverage_0x70343aa7(0x3d7138601187a1229d2ec2d1d68a099ead7efb228d3198b5f027a538aa2c0358); /* statement */ 
swap(possibleNodes, index, possibleNodes.length - ignoringTail - 1);
coverage_0x70343aa7(0x7efa92fc1ca690e8dbca4941424550070abf8e8d98184c7e678e3fd12e2cb296); /* line */ 
            ++ignoringTail;

coverage_0x70343aa7(0x467f35722793bbeb68296818cef3837faebde6743e525ef2506dea2f7a1cca05); /* line */ 
            coverage_0x70343aa7(0x1d41a06451446318cf75fca6502043a367634ca9f1cc0f165366d13bd05df031); /* statement */ 
groupsData.setException(groupIndex, node);
coverage_0x70343aa7(0x5ce499da68917be14c715ca9d6ddcb0ba7b29433f081629479bb955addcb02c8); /* line */ 
            coverage_0x70343aa7(0xa358f6c0de43e4ff810354fca77ad61e8be84489d8181578c5748034fd284cd4); /* statement */ 
schainsData.addSchainForNode(node, groupIndex);
coverage_0x70343aa7(0x22f67234b7fa5ec1e8f61c0358d3eb96334830cdb7e092ea3f05fe10bfa41a72); /* line */ 
            coverage_0x70343aa7(0x16ce18198b2c727a3581a1c1af52034785a93eb7ed4113e8bd22b0b5b964a328); /* assertPre */ 
coverage_0x70343aa7(0xf9ab81f6470c70c2983da1dca71e509b9f21447d52727bbe1d972a33a2f92b66); /* statement */ 
require(removeSpace(node, space), "Could not remove space from Node");coverage_0x70343aa7(0x9b39aefdd366f1c6a5315af2f2c4f32fe269549b24db21d8a5973fcc8576caa3); /* assertPost */ 

        }

        // set generated group
coverage_0x70343aa7(0x1f62ad28aa05bc3487fd784ed75c3393daa409a35068381d83f51436aa12ca63); /* line */ 
        coverage_0x70343aa7(0xf58ad6ca2773e1d7e3f829d114dc27ac69e19a7b09c5885ef9f57617e15d0cd1); /* statement */ 
groupsData.setNodesInGroup(groupIndex, nodesInGroup);
coverage_0x70343aa7(0x1d4928e6daf667b6d443c131d68fcc9371d3c1433db28bd5e721f164137cd810); /* line */ 
        coverage_0x70343aa7(0x4a7cbf5d21ba6dddc2ca36a1e0ed842ae96cfce4ccb892a6b82b63b3c2f304d8); /* statement */ 
emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev removeSpace - occupy space of given Node
     * @param nodeIndex - index of Node at common array of Nodes
     * @param space - needed space to occupy
     * @return if ouccupied - true, else - false
     */
    function removeSpace(uint nodeIndex, uint8 space) internal returns (bool) {coverage_0x70343aa7(0x0d02977b0ae04525237eb25156a17d8d3a8547227b4b55be855f548cbb23b702); /* function */ 

coverage_0x70343aa7(0x40f55e95f78e1ddc97d592c7d54a513a83047baa61e87b71ae7bd17ac2794036); /* line */ 
        coverage_0x70343aa7(0xe168ac768d58a524b974f01004da3618d37d3f202df11eaab51870807df199ba); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
        // uint subarrayLink;
        // bool isNodeFull;
        // (subarrayLink, isNodeFull) = INodesData(nodesDataAddress).nodesLink(nodeIndex);
        // if (isNodeFull) {
        //     return INodesData(nodesDataAddress).removeSpaceFromFullNode(subarrayLink, space);
        // } else {
        //     return INodesData(nodesDataAddress).removeSpaceFromFractionalNode(subarrayLink, space);
        // }
coverage_0x70343aa7(0xa6cde34728ec1fd44903ac3b6d661136351adaeeadde27f3e541ce1702717569); /* line */ 
        coverage_0x70343aa7(0x38158bab9e4516ac26ed62b69c3d78fd218f225f33c36f6c3fc4eaa4b84837b1); /* statement */ 
return INodesData(nodesDataAddress).removeSpaceFromNode(nodeIndex, space);
    }

    function isCorrespond(bytes32 groupIndex, uint nodeIndex) internal view returns (bool) {coverage_0x70343aa7(0xc57e024e47eb9180550fac12b485dedd7ba699f6e95493e899c1ac2f22ddeeee); /* function */ 

coverage_0x70343aa7(0x5a839753c9dafd3655397b985d762b4eb2bdf5d257a353dbca051220f8cafa42); /* line */ 
        coverage_0x70343aa7(0x900a1973a01de979d7ba16ffa13ae444603d211e950de6ff132275960b6ce8c0); /* statement */ 
IGroupsData groupsData = IGroupsData(contractManager.contracts(keccak256(abi.encodePacked(dataName))));
coverage_0x70343aa7(0x3e3a4b4d9c248de7ce30b63e0ca4cc2a8cee645146b44b5bbd1430a32d8bdfbf); /* line */ 
        coverage_0x70343aa7(0x572f95c6799d9bdd5c682f22b82618f0a46676b805f38991f1b29ec92e766d48); /* statement */ 
INodesData nodesData = INodesData(contractManager.contracts(keccak256(abi.encodePacked("NodesData"))));
coverage_0x70343aa7(0x48531b6eec9285ceb3ee3379fb7f69a6924206e42a12667b342e2f678866378f); /* line */ 
        coverage_0x70343aa7(0x1e09bdbb7ce630393c9720db122c0e807468b37720f75ac8052b889fe4d700e4); /* statement */ 
return !groupsData.isExceptionNode(groupIndex, nodeIndex) && nodesData.isNodeActive(nodeIndex);
    }


    // /**
    //  * @dev setNumberOfNodesInGroup - checks is Nodes enough to create Schain
    //  * and returns number of Nodes in group
    //  * and how much space would be occupied on its, based on given type of Schain
    //  * @param groupIndex - Groups identifier
    //  * @param partOfNode - divisor of given type of Schain
    //  * @param dataAddress - address of Data contract
    //  * @return numberOfNodes - number of Nodes in Group
    //  * @return space - needed space to occupy
    //  */
    // function setNumberOfNodesInGroup(bytes32 groupIndex, uint8 partOfNode, address dataAddress)
    // internal view returns (uint numberOfNodes)
    // {
    //     address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
    //     // address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
    //     address schainsDataAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
    //     // uint numberOfAvailableNodes = 0;
    //     uint needNodes = 1;
    //     bool nodesEnough = false;
    //     if (IGroupsData(schainsDataAddress).getNumberOfNodesInGroup(groupIndex) == 0) {
    //         needNodes = IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
    //     }
    //     numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
    //     nodesEnough = INodesData(nodesDataAddress).enoughNodesWithFreeSpace(partOfNode, needNodes);
    //     // if (partOfNode == IConstants(constantsAddress).MEDIUM_DIVISOR()) {
    //     //     numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
    //     //     nodesEnough = INodesData(nodesDataAddress).enoughNodesWithFreeSpace(partOfNode, needNodes);
    //     // } else if (partOfNode == IConstants(constantsAddress).TINY_DIVISOR() || partOfNode == IConstants(constantsAddress).SMALL_DIVISOR()) {
    //     //     space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
    //     //     numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
    //     //     nodesEnough = INodesData(nodesDataAddress).getNumberOfFreeodes(space, needNodes);
    //     // } else if (partOfNode == IConstants(constantsAddress).MEDIUM_TEST_DIVISOR()) {
    //     //     space = IConstants(constantsAddress).TINY_DIVISOR() / partOfNode;
    //     //     numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
    //     //     numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
    //     //     nodesEnough = numberOfAvailableNodes >= needNodes ? true : false;
    //     // } else if (partOfNode == 0) {
    //     //     space = partOfNode;
    //     //     numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
    //     //     numberOfAvailableNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
    //     //     nodesEnough = numberOfAvailableNodes >= needNodes ? true : false;
    //     // } else {
    //     //     revert("Can't set number of nodes. Divisor does not match any valid schain type");
    //     // }
    //     // Check that schain is not created yet
    //     require(nodesEnough, "Not enough nodes to create Schain");
    // }
}