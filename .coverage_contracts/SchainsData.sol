/*
    SchainsData.sol - SKALE Manager
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

import "./GroupsData.sol";
import "./interfaces/ISchainsData.sol";


/**
 * @title SchainsData - Data contract for SchainsFunctionality.
 * Contain all information about SKALE-Chains.
 */
contract SchainsData is ISchainsData, GroupsData {
function coverage_0x4067563c(bytes32 c__0x4067563c) public pure {}


    struct Schain {
        string name;
        address owner;
        uint indexInOwnerList;
        uint8 partOfNode;
        uint lifetime;
        uint32 startDate;
        uint deposit;
        uint64 index;
    }

    /**
    nodeIndex - index of Node which is in process of rotation
    startedRotation - timestamp of starting node rotation
    inRotation - if true, only nodeIndex able to rotate
    */
    struct Rotation {
        uint nodeIndex;
        uint newNodeIndex;
        uint freezeUntil;
    }

    struct LeavingHistory {
        bytes32 schainIndex;
        uint finishedRotation;
    }

    // mapping which contain all schains
    mapping (bytes32 => Schain) public schains;
    // mapping shows schains by owner's address
    mapping (address => bytes32[]) public schainIndexes;
    // mapping shows schains which Node composed in
    mapping (uint => bytes32[]) public schainsForNodes;

    mapping (uint => uint[]) public holesForNodes;

    mapping (bytes32 => Rotation) public rotations;

    mapping (uint => LeavingHistory[]) public leavingHistory;

    // array which contain all schains
    bytes32[] public schainsAtSystem;

    uint64 public numberOfSchains = 0;
    // total resources that schains occupied
    uint public sumOfSchainsResources = 0;

    constructor(string memory newExecutorName, address newContractsAddress) GroupsData(newExecutorName, newContractsAddress) public {coverage_0x4067563c(0x2608ac309e8f79e1c2c8b81ba4495ec99d1b3db4a30c4dfec7b7b4ab81a24737); /* function */ 


    }

    /**
     * @dev initializeSchain - initializes Schain
     * function could be run only by executor
     * @param name - SChain name
     * @param from - Schain owner
     * @param lifetime - initial lifetime of Schain
     * @param deposit - given amount of SKL
     */
    function initializeSchain(
        string calldata name,
        address from,
        uint lifetime,
        uint deposit) external allow("SchainsFunctionality")
    {coverage_0x4067563c(0x8337c4569afe61f5182f9d155ecc93429434460966405bf036fe3e4e3ea077a0); /* function */ 

coverage_0x4067563c(0x721808b222ca858ebc1c3ed23f5ff075ef6ad58ca4f8041af7eab7b48a2b7a0e); /* line */ 
        coverage_0x4067563c(0x6fbbe44bee17ae849dc9982788f5dd0a7057445b7a94746856963ff504ffe6b3); /* statement */ 
bytes32 schainId = keccak256(abi.encodePacked(name));
coverage_0x4067563c(0x1280f61cab7b3fbf7133f47da1429fece72824254713af973d272921e09a0b79); /* line */ 
        coverage_0x4067563c(0xfecc5ea274e49b83c77dfd7cbea709f2580249caa755b6add6678a519ca031b0); /* statement */ 
schains[schainId].name = name;
coverage_0x4067563c(0x70ef507fee9626848685df2fe8ed804d08717e1b51c2eefb6ce96ce3653eb2a4); /* line */ 
        coverage_0x4067563c(0x836c3909d4b5f74e9bf3772653b2781894eb18b5a5676bd3dfe2b612fc0a0062); /* statement */ 
schains[schainId].owner = from;
coverage_0x4067563c(0xf06737c1bfa0cb1f7e1ba735fb6150d45555c1f755099c3cc5a2708375228e1d); /* line */ 
        coverage_0x4067563c(0x38a4cfc63028291648d51573a7e1d59095099138673391f36c0bd076e895b229); /* statement */ 
schains[schainId].startDate = uint32(block.timestamp);
coverage_0x4067563c(0x2808afeeee6379f89ab3abce3398265fa027f4aaa8410e255a7c5cd07919f005); /* line */ 
        coverage_0x4067563c(0x1bea250886a41de3f35e4057b577747407aebdeb7e93b1163aab59a1cdb5f023); /* statement */ 
schains[schainId].lifetime = lifetime;
coverage_0x4067563c(0x2b0444876f7ad225973ef993ab832f26f7cf8840321cb9b14728b98823164a5e); /* line */ 
        coverage_0x4067563c(0xc04854e63281aa935e166163f29e897f56bdfee157f44f741b6079dc524f65e0); /* statement */ 
schains[schainId].deposit = deposit;
coverage_0x4067563c(0xbe586213fa9690efbeaa2d80f05a09503cacdd66ed5c55a17d7df024a98cd851); /* line */ 
        coverage_0x4067563c(0xdaa480539022153982a4198126f34a7179d76a7b244cf80cacfad654aa9c8384); /* statement */ 
schains[schainId].index = numberOfSchains;
coverage_0x4067563c(0xa54b3ea4f38220382a7583614ae0896c0d429512f1d377b3433e19e5db6363fb); /* line */ 
        numberOfSchains++;
coverage_0x4067563c(0x60aff0196a0b458dc7c27009f4eb354b7c70b5b9fc4cdf25c0f128077f3da81e); /* line */ 
        coverage_0x4067563c(0x5cc9c911213544db3ad8845b9f29baf475493e3a0ae6d29639fb71e476284ad2); /* statement */ 
schainsAtSystem.push(schainId);
    }

    /**
     * @dev setSchainIndex - adds Schain's hash to owner
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param from - Schain owner
     */
    function setSchainIndex(bytes32 schainId, address from) external allow("SchainsFunctionality") {coverage_0x4067563c(0x7091810439d19cfd02aeab886a0138cd34e38347326b2b200cc22dfae2ff8241); /* function */ 

coverage_0x4067563c(0x1c0a465416e308db8338af1aef2d8c143bb48d103972b0c2645d61786b05a58d); /* line */ 
        coverage_0x4067563c(0xe044e52308335c943a72fc0fdefa92016ed73b51f999adc7e7c8de4228931648); /* statement */ 
schains[schainId].indexInOwnerList = schainIndexes[from].length;
coverage_0x4067563c(0xd46a64ccd265cadb45898e2b01e9388ddda9368d5d16154fcf9a962bb2e30f9c); /* line */ 
        coverage_0x4067563c(0x5cf0f03ddf40ab4976f2543a7fe3bb0f18cd212d6190452bb9458d01cdfdddf4); /* statement */ 
schainIndexes[from].push(schainId);
    }

    /**
     * @dev addSchainForNode - adds Schain hash to Node
     * function could be run only by executor
     * @param nodeIndex - index of Node
     * @param schainId - hash by Schain name
     */
    function addSchainForNode(uint nodeIndex, bytes32 schainId) external allow(executorName) {coverage_0x4067563c(0x8f7f8b04792733afdd734744cc28eae4c5e34d87166689223653c23c6456d796); /* function */ 

coverage_0x4067563c(0x70fc7a66543d37df505bbfcce9243f075345e267b0f1c75585f6e0a8ed0f1cfb); /* line */ 
        coverage_0x4067563c(0x5ebeda5502e458948c7c599aa60e60c2066398b20925a2a055251ede262176c9); /* statement */ 
if (holesForNodes[nodeIndex].length == 0) {coverage_0x4067563c(0x1c149d0459a40f0afee8de5636e6a7cf24a644af98995b1ca5ad29926a316120); /* branch */ 

coverage_0x4067563c(0xa03e5ecd320db73ec8b636b0f534f7e5de74a6c87b5888f76251fb467472c029); /* line */ 
            coverage_0x4067563c(0x48c4451f95d7b8cba567d82121ec580e3b8c75bd58bbe338f636a4b3528799df); /* statement */ 
schainsForNodes[nodeIndex].push(schainId);
        } else {coverage_0x4067563c(0x34df9a8b70a392ce6516cea01b730cc946b6f6619a06da7c35ab5acdff63e32b); /* branch */ 

coverage_0x4067563c(0x6f92071b56f85ee455ff6d44a8ff7d2a7ba38fab7fce14762d8ee0a8ed8d2450); /* line */ 
            coverage_0x4067563c(0xccf5211d41c34c7b86cbace49cbfd28de5476f8d7be16bff9cafb264f97d5bac); /* statement */ 
schainsForNodes[nodeIndex][holesForNodes[nodeIndex][0]] = schainId;
coverage_0x4067563c(0x5cf85d91d71f7baaac59c511d72d599b61645d9af4ed45e31c4193334cecdeb8); /* line */ 
            coverage_0x4067563c(0xcbb48d144f34da41a0e60683b7a0c8d441c9fa2bdd4306a448566cd0c9ce371a); /* statement */ 
uint min = uint(-1);
coverage_0x4067563c(0xe1e1a8152e7d63f245302e0fb64b547716d670db4f04b6aa012c9e9eac6eac90); /* line */ 
            coverage_0x4067563c(0x04a3847b7db49991c496ec9debb2096f7d543b5e679af591daa3882b3cde8cef); /* statement */ 
uint index = 0;
coverage_0x4067563c(0x84e8a96758b40ddc794cad1af036c384ee0900116424d62c3ed6605e10c9a348); /* line */ 
            coverage_0x4067563c(0x276a02a3e29331ec7acd606b8f5f3e901efdd414d7988086835d9323fbcf50b5); /* statement */ 
for (uint i = 1; i < holesForNodes[nodeIndex].length; i++) {
coverage_0x4067563c(0xd41d4bb4481b019a06f50dd6fb0aa60436955758c26d66e6eb1f3616a19dfe3c); /* line */ 
                coverage_0x4067563c(0x908afdaffc9e53f9fa8ae90a2c8ad9ced9098ae3ea4c624a56925d34e16b34b6); /* statement */ 
if (min > holesForNodes[nodeIndex][i]) {coverage_0x4067563c(0x08f110579b0fa408d421349fa926ffcc0b8e0da2514584a760c7ed9f9f7f07d3); /* branch */ 

coverage_0x4067563c(0x45e348086bbb36fb3bb2cf97bee0b61ae537d05492a2b207417956df9742df4a); /* line */ 
                    coverage_0x4067563c(0x2ac71d080827d81c96a0227c9676c09da5cfa70d5cc1dc6715bc97955d5e002d); /* statement */ 
min = holesForNodes[nodeIndex][i];
coverage_0x4067563c(0x80599a8972c38044cd2bbe70b20ad52d7f3677ee443855dbd639373a2984be5e); /* line */ 
                    coverage_0x4067563c(0x3830f6cac80da91e3393087a59eab8cba49a403a12c9f11cf26e73e7d8a4ddb9); /* statement */ 
index = i;
                }else { coverage_0x4067563c(0x1b177efd8516e41e369f0ef62e7a6704aa151d5b4e93fe56a7d1b44790110fbe); /* branch */ 
}
            }
coverage_0x4067563c(0x34e3232835bee8c46c7a7522ae0b3095e77bae25ede0eb962bcb7efdb98eff82); /* line */ 
            coverage_0x4067563c(0x890ef7ff18be07ea3ec24261cd4879191000aa4d93e9897c188d838652fa57cc); /* statement */ 
if (min == uint(-1)) {coverage_0x4067563c(0x1818f1459df6ba56ef9f690d416c48fe5ba3505adf3fbd42abc1150c8852551b); /* branch */ 

coverage_0x4067563c(0xf627505b56faa6888523f5159c5fe4430ee995b5ee1af1d7852d0db629ee8c4e); /* line */ 
                delete holesForNodes[nodeIndex];
            } else {coverage_0x4067563c(0x91dd28c7c22fe3bb8309982dd4e7e6304ddd8ea77282ccbcf4df3f8719d2b792); /* branch */ 

coverage_0x4067563c(0xb814ce9da6eef0e0d1066ee6938f7ed8335ac75e9523a0da16c8994d19defb99); /* line */ 
                coverage_0x4067563c(0x41e752edc904c802f11e3b97ad138a97e7578a7f89ab4aedb32c35e4a2ed8bce); /* statement */ 
holesForNodes[nodeIndex][0] = min;
coverage_0x4067563c(0x7c476057a27c591fb9a80cf736048616f0cd251168fb94c3d19fb23f778abfb0); /* line */ 
                coverage_0x4067563c(0x6d2a02c5db67b3e0d521b8f32e83497b03ee422425f8bd13b1e6970cfed291c0); /* statement */ 
holesForNodes[nodeIndex][index] = holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
coverage_0x4067563c(0xc72902462f3809d2b3e824d4850b263c7465564fa59f497a89bc688210410af7); /* line */ 
                delete holesForNodes[nodeIndex][holesForNodes[nodeIndex].length - 1];
coverage_0x4067563c(0x97f1fb5089ff7a8e549ffebd5fce2c3bafd4a0037acfdbe2e264878bcadfa21c); /* line */ 
                holesForNodes[nodeIndex].length--;
            }
        }
    }

    /**
     * @dev setSchainPartOfNode - sets how much Schain would be occupy of Node
     * function could be run onlye by executor
     * @param schainId - hash by Schain name
     * @param partOfNode - occupied space
     */
    function setSchainPartOfNode(bytes32 schainId, uint8 partOfNode) external allow(executorName) {coverage_0x4067563c(0x9ae03ce03916563a58c7331c41dadd1bda483e9fced099feded7e8dff8bdf5c2); /* function */ 

coverage_0x4067563c(0xdb552c48875e5493ee4f8d4157cbb902589d42543336d2a5337a50bf93cb308c); /* line */ 
        coverage_0x4067563c(0x5fee7108db87ddf4758cd13f6a9a4ccd4e17a7c35bd1a2e5425bc55d58ea8132); /* statement */ 
schains[schainId].partOfNode = partOfNode;
coverage_0x4067563c(0xe0fc08196892a91db8d73f46eb79f088e846b6924397a4ec401dbf2722afa142); /* line */ 
        coverage_0x4067563c(0xc344408228963cbabc38d1447eea2d2d06c21429c06e751b8e91726241f67e6b); /* statement */ 
if (partOfNode > 0) {coverage_0x4067563c(0x05b790148ab9a6c26ea72ae21536644ae824b75126a621ee2b12938c2e828858); /* branch */ 

coverage_0x4067563c(0xcb29331d1241d25119c4313255a9673503abd08bc7b9d5ffa6ecbef9c8991809); /* line */ 
            coverage_0x4067563c(0xdedc67f4a95b45c86919258fb1cab97398cdd3d6475f4e01bdb66a461a1a658a); /* statement */ 
sumOfSchainsResources += (128 / partOfNode) * groups[schainId].nodesInGroup.length;
        }else { coverage_0x4067563c(0xe75761cb1cc86716b4cd160045a41c9b076d34201531548e0c92fb3dfb25ec1d); /* branch */ 
}
    }

    /**
     * @dev changeLifetime - changes Lifetime for Schain
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param lifetime - time which would be added to lifetime of Schain
     * @param deposit - amount of SKL which payed for this time
     */
    function changeLifetime(bytes32 schainId, uint lifetime, uint deposit) external allow("SchainsFunctionality") {coverage_0x4067563c(0xd687c12163b0ca9024c54ba45b220817137dd055f044c35eb350a00e385d4539); /* function */ 

coverage_0x4067563c(0x58863dddaaceac57e398802bc41c2a24524c5322da9feb9185e23977a3fbcbd7); /* line */ 
        coverage_0x4067563c(0xcb11990edc2e1cecf9cc7cd04cfc98bae88b779ea00076e841b1304be2f8cadf); /* statement */ 
schains[schainId].deposit += deposit;
coverage_0x4067563c(0x5f747a06612ab61a55b85da54ad6211179005344c1b765fc5ef37ceae7020ed4); /* line */ 
        coverage_0x4067563c(0x6b2f3f794b7e779bd657f45503f923b0f317e2f574b4c14d5780fa65b97d8315); /* statement */ 
schains[schainId].lifetime += lifetime;
    }

    /**
     * @dev removeSchain - removes Schain from the system
     * function could be run only by executor
     * @param schainId - hash by Schain name
     * @param from - owner of Schain
     */
    function removeSchain(bytes32 schainId, address from) external allow("SchainsFunctionality") {coverage_0x4067563c(0xb52858ba9325ee587d42392bdd958e8fbb09f3cc22e14d03c4c6ada481ab0544); /* function */ 

coverage_0x4067563c(0xf2cb203ea9e50a7df04519c39638195db13d8f4290b4aa926bb883851c83ca42); /* line */ 
        coverage_0x4067563c(0xb3750cdbcacd41c7b36baf5dacb7bdd936dd8818df25ceee9205fbad82ffb05a); /* statement */ 
uint length = schainIndexes[from].length;
coverage_0x4067563c(0x32b483374af01f44448a15748cf8df5660d2bfd077a18bf0e428bdc51a318ea7); /* line */ 
        coverage_0x4067563c(0xabd0ee3e6d8e1a819050a7e81aaca1f3f0616b5edaebe012baa23097fa7d710b); /* statement */ 
uint index = schains[schainId].indexInOwnerList;
coverage_0x4067563c(0x222bf1b32299e15c4e32def320299d69f6f5ef2e488da4cafc4011dff8e4e610); /* line */ 
        coverage_0x4067563c(0x4309888bbed61f17ddf0f8cd7a3c197e39cb9fe067176c6aa4bc3e22f2e19f5c); /* statement */ 
if (index != length - 1) {coverage_0x4067563c(0xcced9ae46440f9d24053de286e335fa6fa57006ca51641e3e9a02e40edb46257); /* branch */ 

coverage_0x4067563c(0x35899861d32afc18210e16c19e0b3a1496384dc39e4cf657fa59eebebcc7b66d); /* line */ 
            coverage_0x4067563c(0xf50add13a158c73f638d74eb4f92d85eef65cd95575f69277a85cc089e420bf0); /* statement */ 
bytes32 lastSchainId = schainIndexes[from][length - 1];
coverage_0x4067563c(0xd1e67d61805c3f4a28e12676be34c4436e31d2c391e03da850b383c584e85bc4); /* line */ 
            coverage_0x4067563c(0xb59384e4297e96ba557b1c4f81a6b076fbc431d64e7760638a055ff1e5217210); /* statement */ 
schains[lastSchainId].indexInOwnerList = index;
coverage_0x4067563c(0x4159f291495bbe009983f822153a373d164d970710e4bee6b50a188d2350fe9c); /* line */ 
            coverage_0x4067563c(0xf9a3a1183baf999736a12288c37c599c220f6d2e30afd999aa12fb4ddb4c01e4); /* statement */ 
schainIndexes[from][index] = lastSchainId;
        }else { coverage_0x4067563c(0xe0e966f6ace23cbd8fb012122c81850b4e2a9fde52fc839856a6ff3264c2fde8); /* branch */ 
}
coverage_0x4067563c(0x8612e6f70467455793fc420f18c33c20bb443ec0ccf193bf2692c89c1fd5759a); /* line */ 
        delete schainIndexes[from][length - 1];
coverage_0x4067563c(0x94c1cc9da2cd28e22f0b594f25155b7d7bca79abc4edc6a26e778c40dec4fa74); /* line */ 
        schainIndexes[from].length--;

        // TODO:
        // optimize
coverage_0x4067563c(0x98d2f5137fd61545ac78f8aa1dca1ced8d377874ad8606628cff0741daeb8f63); /* line */ 
        coverage_0x4067563c(0xd18c8cdaf011fa0d2b7ad9633898087eb34d0bdb583535f6672a00f800363508); /* statement */ 
for (uint i = 0; i + 1 < schainsAtSystem.length; i++) {
coverage_0x4067563c(0xe35c550423e1922e5b22137c963ab961e6ed4c631b9d2bec1b5a14c5e147e177); /* line */ 
            coverage_0x4067563c(0xf06bff0b7749589e2ad0d850d1ab1ab1ebf41a84565eaa36c4391edc81d11c78); /* statement */ 
if (schainsAtSystem[i] == schainId) {coverage_0x4067563c(0xa064332234d8249b600521f32e1b3369c3fbb7bd7605ae24ca9a921684b285ee); /* branch */ 

coverage_0x4067563c(0x949885c641e6a3090dfc11ebdff9416999749f252dae8a1dc7e24db05ae028f9); /* line */ 
                coverage_0x4067563c(0xc021e5427e49b11639a701a227372e6d1261336f549304044eeb140fe2fec4bd); /* statement */ 
schainsAtSystem[i] = schainsAtSystem[schainsAtSystem.length - 1];
coverage_0x4067563c(0x4c9479b45f52ab0f73ab1bf37106769d913cbc0097d677b7384124ec9ca44ae3); /* line */ 
                break;
            }else { coverage_0x4067563c(0xd8b290725043017a7c4a9895d2928db20a28ba32560114618c035d1126f4283a); /* branch */ 
}
        }
coverage_0x4067563c(0xa832049f131c976a022ab8f643ff8664c46c206c5c029f4a8dcebb70a2a5a41b); /* line */ 
        delete schainsAtSystem[schainsAtSystem.length - 1];
coverage_0x4067563c(0x4dc3cfd953aa175ccf53f236eb5f5f7ebe02713b463611675929200e494be25a); /* line */ 
        schainsAtSystem.length--;

coverage_0x4067563c(0x32cfe2f3285e03e7cf449f0150a477c01b7ec3715eba5bf2543be470bbc6f981); /* line */ 
        delete schains[schainId];
coverage_0x4067563c(0x63ed94d588a3d499baf9bf079d6e2446f35440ca03c93d87411dcc7acddf3dbe); /* line */ 
        numberOfSchains--;
    }

    /**
     * @dev removesSchainForNode - clean given Node of Schain
     * function could be run only by executor
     * @param nodeIndex - index of Node
     * @param schainIndex - index of Schain in schainsForNodes array by this Node
     */
    function removeSchainForNode(uint nodeIndex, uint schainIndex) external allow("SchainsFunctionalityInternal") {coverage_0x4067563c(0xe918887bf3432bd5952aba21ce56720ea1b98743d59157c4437eed465227ef21); /* function */ 

coverage_0x4067563c(0x1129a9792b3348bb6167f3248f52b6ae103e3cdc0169ee294f48023d26a3013e); /* line */ 
        coverage_0x4067563c(0x16eb5663b3ac3e2d08d0ccf37f385caa9ef57e154aa2dde36902e5bd0359a213); /* statement */ 
uint length = schainsForNodes[nodeIndex].length;
coverage_0x4067563c(0x6ac5e60f6bba8102b8f817cec4d81b4f116a66fe24830532ace048c8d5e194c7); /* line */ 
        coverage_0x4067563c(0xb6bfdb6c3f15a11cf5d76086ff12b16a14e78b201271c9cfcd6378bfa957317e); /* statement */ 
if (schainIndex == length - 1) {coverage_0x4067563c(0x3fae2b76b60e8a884a5a41440e5b93cfa0449b9c091f9b86b8488fc0334458fb); /* branch */ 

coverage_0x4067563c(0xd692325166ddaf3a1f25d23017820eb65b6f92b08f67cb6983c241f040c4fc5b); /* line */ 
            delete schainsForNodes[nodeIndex][length - 1];
coverage_0x4067563c(0x6b9e383161830fa3f1a28cfa81863adabdcf035dd272347c9c4fa8300a43b5c9); /* line */ 
            schainsForNodes[nodeIndex].length--;
        } else {coverage_0x4067563c(0xafaca3a239d0849f4d9c4c9b0f3f082f262b47adbeb386e04fcc1d7e710e0bf9); /* branch */ 

coverage_0x4067563c(0x56d3ced14e10575518829b8b5cced5d9307ef5c570bf003eda230da5e58a12f9); /* line */ 
            coverage_0x4067563c(0x26b5af0aa115003db7d495f7b6d5ac54d15ab00bb5cf8d98f1af132a8ecc45c7); /* statement */ 
schainsForNodes[nodeIndex][schainIndex] = bytes32(0);
coverage_0x4067563c(0xcba6cf0c923ae590bda3c3553406224ffab3f396fb99b45a372b5e0eb759060c); /* line */ 
            coverage_0x4067563c(0xe17a3401b53d23c3a4be21f14a49fad353675b28225a3ea2fe3872e2fde26e91); /* statement */ 
if (holesForNodes[nodeIndex].length > 0 && holesForNodes[nodeIndex][0] > schainIndex) {coverage_0x4067563c(0x062968c2eb9d188035cda4e58963aa5d968308c7b01a91af9006423a30a3d8a0); /* branch */ 

coverage_0x4067563c(0x7aa37bf45f8ea21fcfd236defc1f958cbdbe95c4be8b1473e26c1fda67755ed3); /* line */ 
                coverage_0x4067563c(0x5b601e6bae2b5535b0daa26ca1f93859295b37a8ec225e2115d7e8790e7c28de); /* statement */ 
uint hole = holesForNodes[nodeIndex][0];
coverage_0x4067563c(0xe26926eccaba3f3810ed686a8772732ee454bca16d1caba922deef267a680ad2); /* line */ 
                coverage_0x4067563c(0xc418a2d46fd0f338ae35a414655ec0cd923741b93658153daefd92477c613dc1); /* statement */ 
holesForNodes[nodeIndex][0] = schainIndex;
coverage_0x4067563c(0x10a7be8c22f054b2c190fbfe9d94ffa0e9a2c747c8ca63b79f351d6769e3f55a); /* line */ 
                coverage_0x4067563c(0xcf8d0e22786ceb416c1fe2af3630b41646e303b65be5da54fb58afe6da8efb6e); /* statement */ 
holesForNodes[nodeIndex].push(hole);
            } else {coverage_0x4067563c(0x9922e507050b4d93bf8b7b7419b7de2cc91046d16ce1b8a82d1254ec2799709f); /* branch */ 

coverage_0x4067563c(0x18b8640c76f94e9ad3de91b97760b83c242c1d52740cfdb93beb5d45ded83e65); /* line */ 
                coverage_0x4067563c(0xadbe96d21635a4984b22037b2aa485da1ead3af524ac2d0588b88f61b13563db); /* statement */ 
holesForNodes[nodeIndex].push(schainIndex);
            }
        }
    }

    function startRotation(bytes32 schainIndex, uint nodeIndex) external {coverage_0x4067563c(0xf8ecd2f7e29061640880592f855a3c9016e483c9b90b0a6ed5d8596ec069ace1); /* function */ 

coverage_0x4067563c(0xc91f6ba613cbb7a6c00cd3b8fbb9885b615c2d776a81489b46cf94eb50db822e); /* line */ 
        coverage_0x4067563c(0xa6615bbaad56d2dfa1317f0afb1790321bd78c40582342b6c73a76c9d4362d6c); /* statement */ 
rotations[schainIndex].nodeIndex = nodeIndex;
coverage_0x4067563c(0xda6ef9df259d783326bc7ba4a64150d440d74eb16c3ec219665e734148810c67); /* line */ 
        coverage_0x4067563c(0x5d0cb79237da09e43d59891f519886c104663c5f5bdd9fd6c045cc4500b115e7); /* statement */ 
rotations[schainIndex].freezeUntil = now + 12 hours;
    }

    function finishRotation(bytes32 schainIndex, uint nodeIndex, uint newNodeIndex) external {coverage_0x4067563c(0x7d604002c268c19b241c7c0c28cdb1894495ed25f05d69fb64bb2e11f8892672); /* function */ 

coverage_0x4067563c(0x206fe733752794d7e30aafca409022336b0c8839bb5273c6fcd0515c5e3775b3); /* line */ 
        coverage_0x4067563c(0x6fa4bf8df758801a53722009d83d98fbce0fa753c5204944c0662beb5e2487be); /* statement */ 
leavingHistory[nodeIndex].push(LeavingHistory(schainIndex, now + 12 hours));
coverage_0x4067563c(0x45da5da6152a445d760eafa40274da856c992bc6d2d3023dbf96ad3f69b24add); /* line */ 
        coverage_0x4067563c(0x3f61655c76dfa98c4cc402cbee90a95a7022833b942049ba51669917ee20db61); /* statement */ 
rotations[schainIndex].newNodeIndex = newNodeIndex;
    }

    function getRotation(bytes32 schainIndex) external view returns (Rotation memory) {coverage_0x4067563c(0xe05f12570e11100f5b199f5707d8c1dfe01525fb2a55267c6a96700175674148); /* function */ 

coverage_0x4067563c(0x6cabe600dd69740f38352f1e466c973b558ba2acc9c35b5e9c2637a40ef622ac); /* line */ 
        coverage_0x4067563c(0x6a9fbe6a24f482a8a41e392b83e2b5f774edbe4e417853265c574c0218cb6ff8); /* statement */ 
return rotations[schainIndex];
    }

    function getLeavingHistory(uint nodeIndex) external view returns (LeavingHistory[] memory) {coverage_0x4067563c(0x44c4ab3387ed59d1f62cec1afa8210d897e378637bf4c1168ad615b17f59c2da); /* function */ 

coverage_0x4067563c(0xa96a0ec073389dedbf081a3702edfbd2fd54655e912eb95699efae3f85ecf492); /* line */ 
        coverage_0x4067563c(0x33dfb3bb314fd7f16aeec5932d4f2e7652d9913e7d53af2878233cb27bfe1e9e); /* statement */ 
return leavingHistory[nodeIndex];
    }

    /**
     * @dev getSchains - gets all Schains at the system
     * @return array of hashes by Schain names
     */
    function getSchains() external view returns (bytes32[] memory) {coverage_0x4067563c(0x6c9203b367b257bd53bd8efc11010bce059ea2eb085ba7e80a645256fd4d9d83); /* function */ 

coverage_0x4067563c(0xb2a27e09bfe036af86cb94cf1c0cd8b5f2fea67bcc44cd5be4edb2252e657fd9); /* line */ 
        coverage_0x4067563c(0x6166bcb1aeb22236f947d703c72eb21d57d020f71148ce85b21e8c923f385432); /* statement */ 
return schainsAtSystem;
    }

    /**
     * @dev getSchainsPartOfNode - gets occupied space for given Schain
     * @param schainId - hash by Schain name
     * @return occupied space
     */
    function getSchainsPartOfNode(bytes32 schainId) external view returns (uint8) {coverage_0x4067563c(0xb529adb1146cb7dda91edb1fb42bc4f71a954c4518b68442298f66a536486bf7); /* function */ 

coverage_0x4067563c(0x9758d4943427f95d918cdc27c8145761f47c963e01281749012110aa272dfa1a); /* line */ 
        coverage_0x4067563c(0x351803da8802118e3226f2fe0d69fd9b0da96d400304cb67f2be51c4f466aff8); /* statement */ 
return schains[schainId].partOfNode;
    }

    /**
     * @dev getSchainListSize - gets number of created Schains at the system by owner
     * @param from - owner of Schain
     * return number of Schains
     */
    function getSchainListSize(address from) external view returns (uint) {coverage_0x4067563c(0x81e586358779280857e45519cc1c38670be025468e772c7bf4051ce015cbb821); /* function */ 

coverage_0x4067563c(0x12f306188001e805e1b195030222dd5514559a8af21381b3c3ba2e0534bbfaaf); /* line */ 
        coverage_0x4067563c(0x43af52c28c43413e97a0dd5f1110c4adce98edbcf95fb888d0ae8565eb4b90e3); /* statement */ 
return schainIndexes[from].length;
    }

    /**
     * @dev getSchainIdsByAddress - gets array of hashes by Schain names which owned by `from`
     * @param from - owner of some Schains
     * @return array of hashes by Schain names
     */
    function getSchainIdsByAddress(address from) external view returns (bytes32[] memory) {coverage_0x4067563c(0xe9f4661c7e3f310f41ad2ce0bdff3d3d7c6435c74e5fdf4381e7d2f7ea029ea9); /* function */ 

coverage_0x4067563c(0x9dd8b323c6e8972f17378b61fc6ab3759d1817445a5f1b8c6cdc9db6b118deff); /* line */ 
        coverage_0x4067563c(0xf43e392afd505bf65361e32a8cf35af74902d0766cb46f0ae462aa79ce42ea48); /* statement */ 
return schainIndexes[from];
    }

    /**
     * @dev getSchainIdsForNode - returns array of hashes by Schain names,
     * which given Node composed
     * @param nodeIndex - index of Node
     * @return array of hashes by Schain names
     */
    function getSchainIdsForNode(uint nodeIndex) external view returns (bytes32[] memory) {coverage_0x4067563c(0x1a081ecd6a6e148070bf7ec7c9cb2d3792121d4bbb190c84a06550ddb4f3ed35); /* function */ 

coverage_0x4067563c(0x17cc7b849491723b11efc55f8db3baa7c62ffbe0565eafb5d7ddafcbc3270823); /* line */ 
        coverage_0x4067563c(0x55eeaf06d414ab89a688a9b4894478232608433f79cc0e5539e27bf4a60c19a4); /* statement */ 
return schainsForNodes[nodeIndex];
    }

    /**
     * @dev getLengthOfSchainsForNode - returns number of Schains which contain given Node
     * @param nodeIndex - index of Node
     * @return number of Schains
     */
    function getLengthOfSchainsForNode(uint nodeIndex) external view returns (uint) {coverage_0x4067563c(0x3466bbd42b47ec714c936c86a5a754aa073c7817e11760e643c12773cec788f9); /* function */ 

coverage_0x4067563c(0x3cfaf873128420a90279ba28fe3a9838980deaf862ad91426d18a69b380ab1b3); /* line */ 
        coverage_0x4067563c(0xd872f66b5d94990bce0fe122247bb4a50cfa8eb463b3d408875db2910c20a78c); /* statement */ 
return schainsForNodes[nodeIndex].length;
    }

    /**
     * @dev getSchainIdFromSchainName - returns hash of given name
     * @param schainName - name of Schain
     * @return hash
     */
    function getSchainIdFromSchainName(string calldata schainName) external pure returns (bytes32) {coverage_0x4067563c(0xcbb87d2d30c5da3c0a210562fab8bcce9407c8cb204853b6eace0004ee5a7692); /* function */ 

coverage_0x4067563c(0xe53bb195a4c64630d51cc8d55e8c0ee1994b4ebde4b5d13d361160a8b2175c15); /* line */ 
        coverage_0x4067563c(0x8387e7c474f47e944c6bb2b0540901fbe4ad444e1e0b2136209af2466d86cfc9); /* statement */ 
return keccak256(abi.encodePacked(schainName));
    }

    function getSchainOwner(bytes32 schainId) external view returns (address) {coverage_0x4067563c(0xe6d4fe93c59174f044a0d3012412ad2968ea07f605a2231f4b0a22f3a597abd7); /* function */ 

coverage_0x4067563c(0x8c2bc95f886bda170ff41ce48f2962f08d718c1e3333aa1baaf02a3769b85776); /* line */ 
        coverage_0x4067563c(0x30cad89f4d0384311d48264e9f510488084da67d70bc286d47f4f684634657d1); /* statement */ 
return schains[schainId].owner;
    }

    /**
     * @dev isSchainNameAvailable - checks is given name available
     * Need to delete - copy of web3.utils.soliditySha3
     * @param name - possible new name of Schain
     * @return if available - true, else - false
     */
    function isSchainNameAvailable(string calldata name) external view returns (bool) {coverage_0x4067563c(0x4b46fdef3e5e6c312703d7b18a911e51a61b85dd88b8587164d185012a1b4f5d); /* function */ 

coverage_0x4067563c(0x3c703df3c9ddeb7429b9eac8cddc52878b7a9fc29c8fe65c6b034f5514646150); /* line */ 
        coverage_0x4067563c(0xbc1c8619326bab3d93abecc4fc94005a93390cacb7e27044464af6d22fb133c0); /* statement */ 
bytes32 schainId = keccak256(abi.encodePacked(name));
coverage_0x4067563c(0x65a731269dec461984098951e6bdb749189576294f24535610d0ac87757c9062); /* line */ 
        coverage_0x4067563c(0x17aa633fadfa2562a4adbc4cc46338d016fbc51654425448a5faed7b822bf8b1); /* statement */ 
return schains[schainId].owner == address(0);
    }

    /**
     * @dev isTimeExpired - checks is Schain lifetime expired
     * @param schainId - hash by Schain name
     * @return if expired - true, else - false
     */
    function isTimeExpired(bytes32 schainId) external view returns (bool) {coverage_0x4067563c(0xcd4855477771985acf9e3d957c69942593ba113d0d1a186232b2ca8c01a88363); /* function */ 

coverage_0x4067563c(0x28fd36ef6650896c893b865c0302da6c7e5a1836c79610e85fde660c511a06cc); /* line */ 
        coverage_0x4067563c(0x4218079a006f026eb11295229f697d11bb6f7dd6783277af55dd24bccdaff882); /* statement */ 
return schains[schainId].startDate + schains[schainId].lifetime < block.timestamp;
    }

    /**
     * @dev isOwnerAddress - checks is `from` - owner of `schainId` Schain
     * @param from - owner of Schain
     * @param schainId - hash by Schain name
     * @return if owner - true, else - false
     */
    function isOwnerAddress(address from, bytes32 schainId) external view returns (bool) {coverage_0x4067563c(0x53ac2f44831b389658b66f91c1c5be726f2c7ff2dfa226ded31fd351a450984c); /* function */ 

coverage_0x4067563c(0x9079ae0b27ad262e8d73f2f9f3979f678b798fd2db13c17b42390a7f737157f8); /* line */ 
        coverage_0x4067563c(0xb7be81709183be6607ad6c2bb2a0e7fa1fb8698589cf945e6d65fe7f67665bc3); /* statement */ 
return schains[schainId].owner == from;
    }

    function isSchainExist(bytes32 schainId) external view returns (bool) {coverage_0x4067563c(0x73f9d5d8b4e5f87f4b223c79c6e927647f5dee7e737fe31831faac7da3ea12d9); /* function */ 

coverage_0x4067563c(0x2c454e7a6acd2a6314224dc2a333b74f538cf3f203fdc2b3238bd710ea282f40); /* line */ 
        coverage_0x4067563c(0x08c87c899e81ed8b930868c71e0a1be23373c3514ff35728a48d9a946876f57d); /* statement */ 
return keccak256(abi.encodePacked(schains[schainId].name)) != keccak256(abi.encodePacked(""));
    }

    function getSchainName(bytes32 schainId) external view returns (string memory) {coverage_0x4067563c(0x150787cd47a72c08573320d40a056a3eee11ddea4228e78733124abbc180cd2c); /* function */ 

coverage_0x4067563c(0xca4d74f2a1fa8135c7072da8bbe6daa18fc46fccb8f84c97853f94681e8b41d8); /* line */ 
        coverage_0x4067563c(0x346f0e369e5bb0d102920d3449d0fa4d13d6812b3d16083971693e5ef1133c45); /* statement */ 
return schains[schainId].name;
    }

    function getActiveSchain(uint nodeIndex) external view returns (bytes32) {coverage_0x4067563c(0x9eb84926ae74199be4e76c3dfe71420b31fe05eb0af7b078e27583cde9e82443); /* function */ 

coverage_0x4067563c(0x841a756ca5d2abb6ae0ff18bfd8cfd42839c5ba92b34b02251a2a80d311aca42); /* line */ 
        coverage_0x4067563c(0x09c25733b011d26548c05ea0355b049746ecac592ef1339bd2d40bdec9af34d2); /* statement */ 
for (uint i = 0; i < schainsForNodes[nodeIndex].length; i++) {
coverage_0x4067563c(0x49b1fec15507923e8c2172522849104de9ac89e03d4a36b0127732d808e43bb1); /* line */ 
            coverage_0x4067563c(0xe89784bef93d0a7ed1e33f6f09d252de2e57ad54fc42bdea3708f9d85029b668); /* statement */ 
if (schainsForNodes[nodeIndex][i] != bytes32(0)) {coverage_0x4067563c(0x1e7617d08fc1d4f49b8d946c8065b38812ffad269634821e0e9af5d3aa14b42f); /* branch */ 

coverage_0x4067563c(0xbcdc725cbed453e545a3474f6e989bc1d9b26aa80b6c6c738cfe81c10da9cd22); /* line */ 
                coverage_0x4067563c(0x2e9556eab4157f7ac7e0891881e83a151c5d320ffd364b4eb0652d3125c8daa7); /* statement */ 
return schainsForNodes[nodeIndex][i];
            }else { coverage_0x4067563c(0xeabcb47e0af38add182615036a5906ff2e8602719b4e7b36a3cd29c6fc933330); /* branch */ 
}
        }
coverage_0x4067563c(0x833c5b7ca184f1823a4d6f5505d5afd7808ba7c729bb9d9f62a4ef8067047a1d); /* line */ 
        coverage_0x4067563c(0x3aa353c70b67f7b048c162112ef0c5f688d6ecca7d184c4a9080f05049675d0f); /* statement */ 
return bytes32(0);
    }

    function getActiveSchains(uint nodeIndex) external view returns (bytes32[] memory activeSchains) {coverage_0x4067563c(0x467c8ebfab45c9b520e635b4c24d235f37289139c6c74d9c3e05703af3d7d468); /* function */ 

coverage_0x4067563c(0xf5f6a26bd8d3ece9701d8b55788cd023ea78c2857081270567487ea5323654a2); /* line */ 
        coverage_0x4067563c(0x58cd8adb7b39d84041f98024022d5613afd9c7747fca114b4cb9985d3baf359b); /* statement */ 
uint activeAmount = 0;
coverage_0x4067563c(0x545296ec90083c7699511cd93e181f63297b16f76988b226f15c336a99e69f53); /* line */ 
        coverage_0x4067563c(0x3dca8fc4982c8fc9ebbab5a2baa3ad616bc21ad22365041d260b60effbbf0bfd); /* statement */ 
for (uint i = 0; i < schainsForNodes[nodeIndex].length; i++) {
coverage_0x4067563c(0x42abc5a545f872c3ea7e04c7322c556be00aab50f53805e73dd46bd34cde9d60); /* line */ 
            coverage_0x4067563c(0x611204926ca42240bbd02f67c102863f6971f459304fcdb4d70a9d5b0c8a9000); /* statement */ 
if (schainsForNodes[nodeIndex][i] != bytes32(0)) {coverage_0x4067563c(0x103fe790064b91167a498c7f7ad0674ea9346b826a391a8cf66a30963b9d36ab); /* branch */ 

coverage_0x4067563c(0x528afdd33eb5df80317f7ed860d64bc2774bb9ba9269de44edc04a51e0f75867); /* line */ 
                activeAmount++;
            }else { coverage_0x4067563c(0xf4f7103bc7d8da31ff928ba8481bbfe5a0439a1af1c01a6801a6934e48837403); /* branch */ 
}
        }

coverage_0x4067563c(0x9bb3337998a2037f04ccc3beda8d9bcc37a0da403a8e930232359de41673f0e8); /* line */ 
        coverage_0x4067563c(0xe4679ebe97526a65da47fd5656a96804b75e5d3f8cb95208d75c1ecb748f7bc8); /* statement */ 
uint cursor = 0;
coverage_0x4067563c(0x6ed6eaa4302f0df6b151c0627988df6b754f4b8e2cbce789c60be01cbc0b6b22); /* line */ 
        coverage_0x4067563c(0xbe40c3ca75fa9d6629e8edd44ee3ccae1d4f8d2cd3f9691b80264179c3cf2557); /* statement */ 
activeSchains = new bytes32[](activeAmount);
coverage_0x4067563c(0xd1d0600a160fbbb6c600356d301368dc4e84810436294029c73dcae8352562b6); /* line */ 
        coverage_0x4067563c(0xb1412390d8bda9b070d92aee39a749472a44bbdf3b72a75517342c6d971e76ad); /* statement */ 
for (uint i = 0; i < schainsForNodes[nodeIndex].length; i++) {
coverage_0x4067563c(0x34878ca9c2ef903e8b4a6a33c6d366f3a3635b85cf4086646419799b3d2b3176); /* line */ 
            coverage_0x4067563c(0xb81a2f5b0949774e6eec75ee0bf2cab52ff88c4808948fe7ad6847b10dbda5b4); /* statement */ 
if (schainsForNodes[nodeIndex][i] != bytes32(0)) {coverage_0x4067563c(0x96e482f7b1bd5e399b8c54d8ad064a4f3d2ec8d408d4532fe6268930cd6c6c76); /* branch */ 

coverage_0x4067563c(0x92a495f4bba53b11101ea44a4b2981f240672aedacbec17ef7a7b1d439dab888); /* line */ 
                coverage_0x4067563c(0xef9b6f0164e3541bc38da8b3a61f2b9dfc34692fff368cd00d160332e11591dc); /* statement */ 
activeSchains[cursor++] = schainsForNodes[nodeIndex][i];
            }else { coverage_0x4067563c(0xfe01e10b44628ed1581f6773df08751fde229049204cf93b37d5244afbab5181); /* branch */ 
}
        }
    }

}
