/*
    GroupsFunctionality.sol - SKALE Manager
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
function coverage_0xeca4dd85(bytes32 c__0xeca4dd85) public pure {}


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
    constructor(string memory newExecutorName, string memory newDataName, address newContractsAddress) Permissions(newContractsAddress) public {coverage_0xeca4dd85(0x3fbdceed071c1805d5f040d451bc007617ce1dde0dfcd92e5143490d1ea2bd0e); /* function */ 

coverage_0xeca4dd85(0x82550ca9f106cc84e18675dbf1c725c23607817edbec11979cfee1f0c296febf); /* line */ 
        coverage_0xeca4dd85(0xf95c4c3d032e43dfb25da7f8e762e447bbb288baa6d802ee2751541d7266421f); /* statement */ 
executorName = newExecutorName;
coverage_0xeca4dd85(0x2209970d70343712ddc29e8b0ab2e6e489fe85ae395a2b43e86f671f390a76db); /* line */ 
        coverage_0xeca4dd85(0xb905160e19bc1d4c313320373b9b80022abce13ec21b1f912a1f125f71139d4e); /* statement */ 
dataName = newDataName;
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
        uint hashY) external view returns (bool)
    {coverage_0xeca4dd85(0xb8d4b9064d1009254ac2039d603d3a5aab48a31a348ad2066a1bf9beb7fdfb71); /* function */ 

coverage_0xeca4dd85(0xa6551bee737d9d383b0038918fbce4f251cb1a17de00199d9c5961992b0e966c); /* line */ 
        coverage_0xeca4dd85(0xa01ad92a9215e95655523401977c759c25049c07966cc383e0e2aa54fbb300ac); /* statement */ 
address groupsDataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xeca4dd85(0x780ef444feda02b3fd1e5f105db855cb3ebb3e0adb2ae9484f751be212e053aa); /* line */ 
        coverage_0xeca4dd85(0xb8a23f83dbfa9e477ebbef5d0260d300ca4eff2867603fd7d3d655248d95bc8f); /* statement */ 
uint publicKeyx1;
coverage_0xeca4dd85(0xa2a43b0ad75e560d7eb7b0836600bafa975708d791d083f1bb020771dfe3abc0); /* line */ 
        coverage_0xeca4dd85(0xb147e22dfbacdf29a3287a190a2be15b251ada1f9353d5023f3a1fd58d0fb78d); /* statement */ 
uint publicKeyy1;
coverage_0xeca4dd85(0x0a32b8e4a6c5e06563994e06e2dd686faf2fbcebdca93703fb8e2e472bd1eada); /* line */ 
        coverage_0xeca4dd85(0x7246b1327a78a6b89db4353cee2b74f2e24225d266988ab29678c293ec9c51c6); /* statement */ 
uint publicKeyx2;
coverage_0xeca4dd85(0xa21203ebf6a49cf63569a6bdff8ec43b87b0afbbe25b041c8f2d791446a9124e); /* line */ 
        coverage_0xeca4dd85(0xfd6ae977b5dcf739f6e87ad679852e7fbc723093ddb2d9feab7690e97abc0756); /* statement */ 
uint publicKeyy2;
coverage_0xeca4dd85(0xe78375a5013746c672bc2a5a5ba20ffecd0f74ab80a0e8f80ee641cc2798e0c5); /* line */ 
        coverage_0xeca4dd85(0x7a4115789af83f5554d02cddf3ffbb8bb133e3425b35454714b01e23ddad34c1); /* statement */ 
(publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2) = IGroupsData(groupsDataAddress).getGroupsPublicKey(groupIndex);
coverage_0xeca4dd85(0x81e03eb154ef61be5084a5957fa700257e9f88d40662986c620f481ab6a4f13e); /* line */ 
        coverage_0xeca4dd85(0x86011467728f6db53536c404c3113867892d14c079e66e7f1b5752723ee46915); /* statement */ 
address skaleVerifierAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleVerifier")));
coverage_0xeca4dd85(0x5ea7dc48c6eae63f445b10c608a2d25e1e88a190da6be07c63d9a1aa49a6cb71); /* line */ 
        coverage_0xeca4dd85(0xf3b7c031a86f1d330efc8689c1a9fe618ca3c184a622d85324649835105c1ce8); /* statement */ 
return ISkaleVerifier(skaleVerifierAddress).verify(
            signatureX, signatureY, hashX, hashY, publicKeyx1, publicKeyy1, publicKeyx2, publicKeyy2
        );
    }

    /**
     * @dev addGroup - creates and adds new Group to Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function addGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {coverage_0xeca4dd85(0xc3852aac363655e024a5940663b43bae64d7b0e374aef848772225de36f1923f); /* function */ 

coverage_0xeca4dd85(0x00843b623d46e6540d0503db63e0069038d6b678f94d800d51b6609e3931e6b1); /* line */ 
        coverage_0xeca4dd85(0x7dbd48bc05bdc20d79d824a021bc39d6b51ec36e1baf0c5bb30129fd12cce9d7); /* statement */ 
address groupsDataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xeca4dd85(0x769acb31c10540ab5b1bf256c6170cf1a63c415a872a908bd5443522d9cebc74); /* line */ 
        coverage_0xeca4dd85(0x70b9ad3031091883fb600518182667e48cafe21ff6f4e43a7a33888f4bb151c3); /* statement */ 
IGroupsData(groupsDataAddress).addGroup(groupIndex, newRecommendedNumberOfNodes, data);
coverage_0xeca4dd85(0xbec579a5f06ba86e11fbb32181e5bde510326b207833446bee4bce05387c1445); /* line */ 
        coverage_0xeca4dd85(0x1b32bdc07d916901610f808ed5786fd4f3dadec182a83405d9d11961ddb1a09c); /* statement */ 
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
    function deleteGroup(bytes32 groupIndex) public allow(executorName) {coverage_0xeca4dd85(0x7cde8a9d30c8927bdd866a58db05b3df4ba2e241bd3e7547629c1b6bf3050e17); /* function */ 

coverage_0xeca4dd85(0x188f72f2e678b4dddee35bed82bf50cd150915972b23c07375bf5b793a5ac2af); /* line */ 
        coverage_0xeca4dd85(0x05e9f2a201ce3eabbb62910b2474a2c7833ae3f1b38d1a214f6483bb1b87912b); /* statement */ 
address groupsDataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xeca4dd85(0x7e07ce3ed4bdc1e7f96906d07463ca0d97678097a0d7346532a13cd4026d6ff7); /* line */ 
        coverage_0xeca4dd85(0x45780866b53fb87530e676bee0f8361a65e3eaea9be52b7cc830989f319c429b); /* assertPre */ 
coverage_0xeca4dd85(0x1019af7bd5d49c397486fec37a4a093b562629c39618c4d8a2d530d3c678abaf); /* statement */ 
require(IGroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");coverage_0xeca4dd85(0x996c41165ef3c912aae2360a3acdc9ace141c7918a61a60ca68792ca0fc7f7cf); /* assertPost */ 

coverage_0xeca4dd85(0x1ca451b6c5977397a6e7d6d02baeaeeaab84adc965edaf05aa2ac56bae79d7f3); /* line */ 
        coverage_0xeca4dd85(0x56f36449f14c5b11079e7645ce98a3bdafee7495364fe939d3283b7315463849); /* statement */ 
IGroupsData(groupsDataAddress).removeGroup(groupIndex);
coverage_0xeca4dd85(0x11107657a5b3fa85769d8295cd5eea8e2913c49538ab306787e9ed571b5d0624); /* line */ 
        coverage_0xeca4dd85(0x3587c590bcf64bafc42dab1c6cfd2214f4e4b42512d9a6d8ed45f6049d19462d); /* statement */ 
IGroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
coverage_0xeca4dd85(0x852c8d0c516c0054c3c5cf3489efd222c63e9723576bf3d0e9d277c4c4792ff0); /* line */ 
        coverage_0xeca4dd85(0x5263c19c75488607fbd251792d71c074b617a66b89e40edee7c95144e7eb895a); /* statement */ 
emit GroupDeleted(groupIndex, uint32(block.timestamp), gasleft());
    }

    /**
     * @dev upgradeGroup - upgrade Group at Data contract
     * function could be run only by executor
     * @param groupIndex - Groups identifier
     * @param newRecommendedNumberOfNodes - recommended number of Nodes
     * @param data - some extra data
     */
    function upgradeGroup(bytes32 groupIndex, uint newRecommendedNumberOfNodes, bytes32 data) public allow(executorName) {coverage_0xeca4dd85(0x978c49b6613ac6f946f84e6540f0a65268f25c2ecc244ee1ea861ccd3ab6d6e8); /* function */ 

coverage_0xeca4dd85(0x2f7d3b6e0fa35febf63987c7861fea8d3fc09dc2aad784b94db6ddaa78bd6498); /* line */ 
        coverage_0xeca4dd85(0x210c3a75422d753e87a1926d9b15d27c8f080e1fcc4cce1ed04b58213fba4751); /* statement */ 
address groupsDataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xeca4dd85(0x56348e08aa9cee1a6c758efab8c66f1a1e752566b219e3e417f31f14575bd823); /* line */ 
        coverage_0xeca4dd85(0x283899007c8d3319e315c2c627dd229a38016e30f515eec04092c26f190b52d5); /* assertPre */ 
coverage_0xeca4dd85(0x7cdb22a4a22a9ef2eacb132c2b1fd6ae987879644a0043b63dcab238b33b2265); /* statement */ 
require(IGroupsData(groupsDataAddress).isGroupActive(groupIndex), "Group is not active");coverage_0xeca4dd85(0x67653223de5da2501fd67fa39606f4e8a01c43f98f04d2d51421436461d62bbb); /* assertPost */ 

coverage_0xeca4dd85(0xecdcd9bdb980be32dd0399d62bbb063d9ca05bcd0b54c1d3a36f51b8e3f92316); /* line */ 
        coverage_0xeca4dd85(0xda3c7cb5c06390baac036af374d52d138a94b6db9563fcc4bab134cb3b1d49b6); /* statement */ 
IGroupsData(groupsDataAddress).removeGroup(groupIndex);
coverage_0xeca4dd85(0xe4e1e840946a4bc9b8f5d48446def84221a0f170ed35d8f70bf1ddf4e6022992); /* line */ 
        coverage_0xeca4dd85(0xc4bdea23076a4d4f861553d088beca5ec163588eab23b207077ce2f3cb1d835c); /* statement */ 
IGroupsData(groupsDataAddress).removeAllNodesInGroup(groupIndex);
coverage_0xeca4dd85(0x72034428d4498582826d050e03649e2bdaaa8bc4df257e1ed8c620c2560740c4); /* line */ 
        coverage_0xeca4dd85(0xf2ffbb3b117125332e19ddab44e3d8d5e93783c90ce2a3845e0a508c4bfe3db0); /* statement */ 
IGroupsData(groupsDataAddress).addGroup(groupIndex, newRecommendedNumberOfNodes, data);
coverage_0xeca4dd85(0xde69a7c9232eff88069a535409fa2a6784c15daf8183925197fbf2d3ca4b73c1); /* line */ 
        coverage_0xeca4dd85(0xf046c4e9b2db06d9511b567a6b05e1be7583e23ce863d5fc675af4fe2dd28c0a); /* statement */ 
emit GroupUpgraded(
            groupIndex,
            data,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev findNode - find local index of Node in Schain
     * @param groupIndex - Groups identifier
     * @param nodeIndex - global index of Node
     * @return local index of Node in Schain
     */
    function findNode(bytes32 groupIndex, uint nodeIndex) internal view returns (uint index) {coverage_0xeca4dd85(0x8f3cd25f07a3bf47db66fdb3cfc92610a370d1279991914020df656b944bd1db); /* function */ 

coverage_0xeca4dd85(0xc32207824cb163fe870f8cafc1b0ce3a8560d31edc93eefdfd9b2e4bdb3412e8); /* line */ 
        coverage_0xeca4dd85(0x92890fa856f05655090ffb0fccd0c68b7f81126604dca937f663575b8dfdcd8c); /* statement */ 
address groupsDataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xeca4dd85(0x02246cccc142ee8603aab0dbbf9080d529f4a748fa7f3e6462a2d30cedcca949); /* line */ 
        coverage_0xeca4dd85(0x516d61abcfb8e06804ebe485012884e95305bd512f33b3a86fcb39c38efa8e97); /* statement */ 
uint[] memory nodesInGroup = IGroupsData(groupsDataAddress).getNodesInGroup(groupIndex);
coverage_0xeca4dd85(0xc2cb95336f7f78cf4b35f4a801f0a686840471f832618a5ce8f70c74da9700ce); /* line */ 
        coverage_0xeca4dd85(0x303fa6254a9e6629296c538877c77ebe65a28b4bac3b0fb5aba337cb93f84fad); /* statement */ 
for (index = 0; index < nodesInGroup.length; index++) {
coverage_0xeca4dd85(0x8ed82badcb790f5648326abfd466d0a2167ece3ade6467b28026a17d05e4a4ea); /* line */ 
            coverage_0xeca4dd85(0xfff37ac7506cc90a0dd7b5fea05881f6b0fe7cc1ccc2e78cb45049e40a9869dd); /* statement */ 
if (nodesInGroup[index] == nodeIndex) {coverage_0xeca4dd85(0xebfbb427d03f63dfd64c7d106d56492307a76463cabc68f2a575be02349a309f); /* branch */ 

coverage_0xeca4dd85(0xb8eb544989184e637892d3eaa9cc93e95ad05b1dfcef9a40f0616dbea5da8f14); /* line */ 
                coverage_0xeca4dd85(0x900ae1df1dcbd425b9a97d1a22853be9ec51105d163fac8c92eb309623cb862e); /* statement */ 
return index;
            }else { coverage_0xeca4dd85(0x7be70ae76275769bf444055607290ed00092426abd7c6124d5ce11aa983dbd27); /* branch */ 
}
        }
coverage_0xeca4dd85(0xf6e2f43facc477046bf9b3c14dbf3f9a4aeb6a4f79022268115cd5500489b1ac); /* line */ 
        coverage_0xeca4dd85(0x37da52e846694550a83519d719306a0d14116df4532b3310e1d1bca9f9db728c); /* statement */ 
return index;
    }

    /**
     * @dev generateGroup - abstract method which would be implemented in inherited contracts
     * function generates group of Nodes
     * @param groupIndex - Groups identifier
     * return array of indexes of Nodes in Group
     */
    function generateGroup(bytes32 groupIndex) internal returns (uint[] memory);

    function swap(uint[] memory array, uint index1, uint index2) internal pure {coverage_0xeca4dd85(0xdadb33c79cf01049555fcecc46777d70818c8f7fae7a087df820b9ca2c311670); /* function */ 

coverage_0xeca4dd85(0xeddbd0357efcd316694b8e95e884a0d8c085e54b8b713da1e2949e0fda8a24ba); /* line */ 
        coverage_0xeca4dd85(0x4efc99a127df8470402f943ad91a1e6d821adff4272edf1b092951350fe35569); /* statement */ 
uint buffer = array[index1];
coverage_0xeca4dd85(0xa93c0a7f07a6284e85321be4d6e29614156a1e2646a5d146728bb8bdae3bf76e); /* line */ 
        coverage_0xeca4dd85(0x5560303db82c2fb1c7084e8a89fa6a39d5ae67065162a32dc295c078de63bf5b); /* statement */ 
array[index1] = array[index2];
coverage_0xeca4dd85(0x5793b289adf2673dc564ba929b66789d6b8c71dddb25039f2648bfe90a63489f); /* line */ 
        coverage_0xeca4dd85(0x2bbba25e5673f2fa3b6baef5ac250a137c938c083f6692df355fa00f36cf5674); /* statement */ 
array[index2] = buffer;
    }
}
