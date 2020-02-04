/*
    SkaleManager.sol - SKALE Manager
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
import "./interfaces/INodesData.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/ISkaleToken.sol";
import "./interfaces/INodesFunctionality.sol";
import "./interfaces/IValidatorsFunctionality.sol";
import "./interfaces/ISchainsFunctionality.sol";
import "./interfaces/IManagerData.sol";
import "./ValidatorsFunctionality.sol";
import "./NodesFunctionality.sol";
import "./NodesData.sol";
import "./SchainsFunctionality.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/introspection/IERC1820Registry.sol";


contract SkaleManager is IERC777Recipient, Permissions {
function coverage_0x49c6355c(bytes32 c__0x49c6355c) public pure {}

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    bytes32 constant private TOKENS_RECIPIENT_INTERFACE_HASH = 0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b;

    enum TransactionOperation {CreateNode, CreateSchain}

    event BountyGot(
        uint indexed nodeIndex,
        address owner,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint bounty,
        uint32 time,
        uint gasSpend
    );

    constructor(address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x49c6355c(0x28d7df800499915974f1a120baa5d845ff1d9a6ab1d7a8b86d6e0a2dba329f84); /* function */ 

coverage_0x49c6355c(0x9048cc566547b3c4245e8d92b690595f9c3ab4b7799c7f9f19f216b191db9616); /* line */ 
        coverage_0x49c6355c(0x2499df1a003a426bf5be5071f1d2d5b7118929b6e65ca885ec57375d9aaa8777); /* statement */ 
_erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 value,
        bytes calldata userData,
        bytes calldata operatorData
    )
        external
        allow("SkaleToken")
    {coverage_0x49c6355c(0x34c05c2e2afb2c3ccec8f6ab87440a5cd40c05402770e44bfe52150f679e8718); /* function */ 

coverage_0x49c6355c(0xfe6ac4020ff259926ef4124e1cdcef27d7b1ce2e63e16168a85098230d4d68f1); /* line */ 
        coverage_0x49c6355c(0x535375ac99f20c24703492765f2f6592b080cac60ad96b66da44acf8ecf68faa); /* statement */ 
TransactionOperation operationType = fallbackOperationTypeConvert(userData);
coverage_0x49c6355c(0x22920f3d26880fbbfd8064de3ed959afbf477a82d4f6c221668d6a731db2e153); /* line */ 
        coverage_0x49c6355c(0xcd1faba79d8ec88166e2ac430caa81eefadb570853db3846901ae566f6abe721); /* statement */ 
if (operationType == TransactionOperation.CreateNode) {coverage_0x49c6355c(0x5a2e117cfd7500f8aa9c3ba25d1d093f58058231807d92d8004af0dc081a665d); /* branch */ 

coverage_0x49c6355c(0x64d67aa6cabff34cc34d8db3e984ad8ec0a58fce0a5502950470058c9b95a77a); /* line */ 
            coverage_0x49c6355c(0x45da303bd311182ed4c39e2b369320000a94a822124dcd9776d829e0a1212d98); /* statement */ 
address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
coverage_0x49c6355c(0x6fe6029eb42f1e00747d45cc01ba2f5867d8105ba9cac76589d85350598c50a2); /* line */ 
            coverage_0x49c6355c(0x30ac260e76c9755e7025b75a2ff4f54e1d2694ec743678ab303df894d3c645d7); /* statement */ 
address validatorsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0x5ce3358767ef7cff84d0273a3b6e0bcdaf4218c81a3fbfc06520704b4135c115); /* line */ 
            coverage_0x49c6355c(0xf122f7ea3800b93ab095102e05db4f01450f6581ca8b5c440b0485e9f2c4d406); /* statement */ 
uint nodeIndex = INodesFunctionality(nodesFunctionalityAddress).createNode(from, value, userData);
coverage_0x49c6355c(0x438f992e77231d0c0449e2c6bcc1180267e43cd725e4de83825ff9e98172c7c3); /* line */ 
            coverage_0x49c6355c(0x713023e36d3a1c14e677f141359b51d4125eeb856f5b6c68b05e85e90e66e7cd); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).addValidator(nodeIndex);
        } else {coverage_0x49c6355c(0x19049b18f8c250c41e03e2de1abb8f5ed316474119c75c6ac731641b3187bb49); /* statement */ 
coverage_0x49c6355c(0xda462fa2eb9b2e566983d7fe690b924e8c298a70da1e6475820316c2c6aa8673); /* branch */ 
if (operationType == TransactionOperation.CreateSchain) {coverage_0x49c6355c(0xb0e8f0fa33a71a291c78093730adb4cb68b2393f6037f01dbc92d5185e538a9d); /* branch */ 

coverage_0x49c6355c(0x4dded7587601e3ed75461c7227bc6a4a86a65b595df6d03a90df3e08afb27830); /* line */ 
            coverage_0x49c6355c(0x26c2f47cc1824eab2171f71afc385453e9d0041e89a0a174836e1d0c165e8da6); /* statement */ 
address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
coverage_0x49c6355c(0x118ded1f7105b8915740c5100f2256e4c1e48be3840411d2c432e7fdafebb068); /* line */ 
            coverage_0x49c6355c(0x376e88b89e9dd7f1edd665ba5d5788ec8b0064aa86beeee359322fa75f46bd9b); /* statement */ 
ISchainsFunctionality(schainsFunctionalityAddress).addSchain(from, value, userData);
        }else { coverage_0x49c6355c(0xe054a9e13024d184a768d94217d5d521f0677899d409cf364692aed6d06a5a34); /* branch */ 
}}
    }

    function nodeExit(uint nodeIndex) external {coverage_0x49c6355c(0x6312bdd2d9596fd1a10b4fa1533a19daf0dca15adfeb931f2f24e2b47c72e7fc); /* function */ 

coverage_0x49c6355c(0xe694d32fe35a5597a264b00bc9d2af94e275dc3229c37affa0eab574ce93b2f8); /* line */ 
        coverage_0x49c6355c(0x720f96920b7af2fca4aa1c78f47095cf1162fd2d2726aa21fdc0ea9b3c94adf5); /* statement */ 
NodesData nodesData = NodesData(contractManager.getContract("NodesData"));
coverage_0x49c6355c(0x49491d5e4f65318a794a9d2fa5715fe6583cf5800db671a1aa8f34ac26ad1b2a); /* line */ 
        coverage_0x49c6355c(0x10140e5ed129024ae435b079789d908c686430fc822ed78e4cf5186b10d8f1e0); /* statement */ 
NodesFunctionality nodesFunctionality = NodesFunctionality(contractManager.getContract("NodesFunctionality"));
coverage_0x49c6355c(0xc17e54ea223d9e437029c175c93786b4405f49ac52882b239013f40b8129474d); /* line */ 
        coverage_0x49c6355c(0xbc66508cbd21e6fb5d7fc49006ec272bd11efbff0f1fcf4631d7ff59eb4ed78f); /* statement */ 
SchainsFunctionality schainsFunctionality = SchainsFunctionality(contractManager.getContract("SchainsFunctionality"));
coverage_0x49c6355c(0xa3951510d206662ef77a0e8965288ebb6bab36fce4ff7ca55adaad96520e8056); /* line */ 
        coverage_0x49c6355c(0x73fa211773a033f3674e28e8dffe7f6f8b4507b29e27f36ea5ab213a13f068ab); /* statement */ 
SchainsData schainsData = SchainsData(contractManager.getContract("SchainsData"));
coverage_0x49c6355c(0xd67ff7b730e99960c24bf6c4fe929680f1c3c07d912f8e11a562aa54eb6b3eb1); /* line */ 
        coverage_0x49c6355c(0x88caac20f68abda17f61d2ec723b709967441549328af66642369a89148d1cdc); /* statement */ 
schainsFunctionality.freezeSchains(nodeIndex);
coverage_0x49c6355c(0xc91f1f64a3ed45bc98211e81d6c868edddfc4dfa52dd2599ee5a3e6d344df700); /* line */ 
        coverage_0x49c6355c(0x2664b5184c071f081f7f700659dbfe61d6396c36cccb895e51bf32218d440cd1); /* statement */ 
if (nodesData.isNodeActive(nodeIndex)) {coverage_0x49c6355c(0x366ae3591d6385280b264b01f248eaf22bd966304580807bb0963c1419b73d82); /* branch */ 

coverage_0x49c6355c(0x2a68e3d2f9fe127a7d128dedd4e8e577ae163237aa3f7ff8084166aeecd2a43a); /* line */ 
            coverage_0x49c6355c(0xaee612852718512932e515fb2cd9da6bc6cc09b752fa50e20cc0bbd92c9156da); /* assertPre */ 
coverage_0x49c6355c(0x3910414285512ebbaa20fe435cab6f044372ed04714e0d409e81eb6e6b91a9b8); /* statement */ 
require(nodesFunctionality.initExit(msg.sender, nodeIndex), "Initialization of node exit is failed");coverage_0x49c6355c(0x7fc689f04ae896f34bbf7f97b21df57e367388798a772d0ad12e208c1cac15a8); /* assertPost */ 

        }else { coverage_0x49c6355c(0x4652c96323b5338fdc465a30797672863bfc9fbef052f6176458b69eed16343a); /* branch */ 
}
coverage_0x49c6355c(0x81f291df052749b378b41c4a7e4574ce8876b4715bdadc8e11a691e990a39b91); /* line */ 
        coverage_0x49c6355c(0x661c17bc1ab6aafe9579e20462a0595d86ff641c49b2aa1e9f464854ecf874df); /* statement */ 
bool completed;
coverage_0x49c6355c(0x67f86e68c221ae5222966cfe699aad6a57246d9ea094ee3c9dddd67efca4528c); /* line */ 
        coverage_0x49c6355c(0x4db43b28748188db1a1730de3272271c819b02b1faa5311346fe06a2b0c59e5a); /* statement */ 
if (schainsData.getActiveSchain(nodeIndex) != bytes32(0)) {coverage_0x49c6355c(0x0b58d9ca9d74a3c0e87ee2a72cbecfa037cf93e7f425983c916037283c2c060b); /* branch */ 

coverage_0x49c6355c(0xe1680f31ffa678476de9040041186e823e748c086ac18c0f340793dbb3562fe0); /* line */ 
            coverage_0x49c6355c(0x76230b54e87f5d6a1afcda51ec0269ae245cf09adccc392061e6bbdca26b03e9); /* statement */ 
completed = schainsFunctionality.exitFromSchain(nodeIndex);
        } else {coverage_0x49c6355c(0x910559b0f463ff8e47cb307d38bfe90fbd0f73ce71248c6a363ceb75ee269325); /* branch */ 

coverage_0x49c6355c(0xa12218a532baae0a062091e24237b9d536ad75155d1fb0401523c7d39b3c9b41); /* line */ 
            coverage_0x49c6355c(0x8396fb73e5df6d074bc00677e2965c724f348475feef3feb7bbc3d8c9c80d013); /* statement */ 
completed = true;
        }
coverage_0x49c6355c(0x9cfcf37a33d95cda6e57834a88317046067450d43aaf4cd7225a346bef8d23fc); /* line */ 
        coverage_0x49c6355c(0xcac38f28784f73888e1b038f135de995c45d3b9e10ced3cc15ae285bf0eb4c5d); /* statement */ 
if (completed) {coverage_0x49c6355c(0x5bbd36c0eb696125ebb9e8ffd603c593f11a255f86eb149cf4e97fbe2a93ce1d); /* branch */ 

coverage_0x49c6355c(0xeaee82812597188641677d3f6e2e1d27803ded5e886f47c25ddf072e724c8875); /* line */ 
            coverage_0x49c6355c(0xf46f27a63461c8d54dc267ea9e8bb6576ef746f2925295445aa2504e542928b1); /* assertPre */ 
coverage_0x49c6355c(0xc60b6a80dcc987bb8d243e8c0e3c848c960c8aca0210f2f98dbdd34f1d66fd02); /* statement */ 
require(nodesFunctionality.completeExit(msg.sender, nodeIndex), "Finishing of node exit is failed");coverage_0x49c6355c(0xc43f01d4446fe79c37b8420d49b770710e1cde13e06e694eee1688eaa6c84d31); /* assertPost */ 

        }else { coverage_0x49c6355c(0x5e89ae1fbefcf11036ce811e10d64c4fb3fca05dcbd4b87c69c782bb7b72d3a7); /* branch */ 
}
    }

    function deleteNode(uint nodeIndex) external {coverage_0x49c6355c(0xc3c63188b29f6b7aeb3b22c8cdce0178dca559a05b6efa99e6acb8b918b3626d); /* function */ 

coverage_0x49c6355c(0x8867df4e78839720e943f6ba7abb7616d7596a54a4dc41a7e26e02d3a2613cc9); /* line */ 
        coverage_0x49c6355c(0xe9028a40de9db2451d7ebaa14ce898f2574cf3979dfb7e53dfede7cc570f09e9); /* statement */ 
address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
coverage_0x49c6355c(0xd4816c236a874ba4124814515e631fcc27889b93da10fd975d040e7c64d814f2); /* line */ 
        coverage_0x49c6355c(0xcea458ddc0358759121b028cb546d1db27d1896124d43d103a7dcd6363eea2ba); /* statement */ 
INodesFunctionality(nodesFunctionalityAddress).removeNode(msg.sender, nodeIndex);
coverage_0x49c6355c(0x69a686953eba4c3267decccd43025574702537bd21f764ae09d293452ac498f3); /* line */ 
        coverage_0x49c6355c(0x31df127ef2158e72720000213390ba7b5437a78c5cae1860441b52b25136f3f9); /* statement */ 
address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0x5845e719eb33d63e7e8b06af5cf1246de9f0b08f7f4f886e4783bc5b53465d94); /* line */ 
        coverage_0x49c6355c(0x1bbd33d695eb3b3d3d52e73b0380aa3b392faa524544ac2af794dda743899c6e); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteNodeByRoot(uint nodeIndex) external onlyOwner {coverage_0x49c6355c(0xba0b1568834e0fc63e5aa89e259553bdfa7821e92b930d7a71ef15a9a54fc9f3); /* function */ 

coverage_0x49c6355c(0x344c743954f1dde7f3965a988dd28228d51f3df6a889dff719dad90db61d6315); /* line */ 
        coverage_0x49c6355c(0x338e331227b4bf14c31c7b3998d4d6fcbd34db62d06f4649263968a10734b10d); /* statement */ 
address nodesFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesFunctionality")));
coverage_0x49c6355c(0x8a4038fe9a26f4d0ed9170f57c15392d8bf02e09fd0583b6f79c0434f071f632); /* line */ 
        coverage_0x49c6355c(0x2da56a0df171c97ec451c9e8f528496f21f0edf570931f38d58d82385428a066); /* statement */ 
INodesFunctionality(nodesFunctionalityAddress).removeNodeByRoot(nodeIndex);
coverage_0x49c6355c(0x0dd8d4efb5bf379cbb51b3c2e31d88a5135e20428d474aac352483f7e61ec290); /* line */ 
        coverage_0x49c6355c(0xd2b77447297b45966bced01513c19b34c74eb7652063305270f35b36587fda97); /* statement */ 
address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0x0f98e87241bad831085134a2e3fb9505256dfb1fd764622b8374393bf9b78204); /* line */ 
        coverage_0x49c6355c(0x04b4ab8904ff791feb535eab240e3b5b6f41d26f15f428d8e345c0811f630991); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).deleteValidatorByRoot(nodeIndex);
    }

    function deleteSchain(string calldata name) external {coverage_0x49c6355c(0x3b67199c66339e9011c86158d7f58461fd4aae5abdd8247d5b2ebf68b4b80aca); /* function */ 

coverage_0x49c6355c(0x5ecf7ee8a555792ff370a380aef31a28e11d38c23064ff87d81199fba34395be); /* line */ 
        coverage_0x49c6355c(0x02f9c8dc76361a8dbde11eacf164fda891aeafb719428a25261df759ae4cf6af); /* statement */ 
address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
coverage_0x49c6355c(0x8bb581d18033e3be029a2f5d3c4b21b155cd2d2588e1724baa72b46c1dc3dfae); /* line */ 
        coverage_0x49c6355c(0x66b024826290f8d704019c7a2b8ed342ed4c67eef48bb31d5ebfb101382d9685); /* statement */ 
ISchainsFunctionality(schainsFunctionalityAddress).deleteSchain(msg.sender, name);
    }

    function deleteSchainByRoot(string calldata name) external {coverage_0x49c6355c(0x4ee85d5c44dfe6fce6c3582ab6b10e3c0c5e568a0e3bbeed610c20966656177e); /* function */ 

coverage_0x49c6355c(0xc4e6d56ba95f1dddc2416aeef523bc776db3b5056b34462b748f833d78533e09); /* line */ 
        coverage_0x49c6355c(0x979bffaf8fc57a92ffb2f500b182b4b91bd99caa5b4c61d746d80d35a0d4bde9); /* statement */ 
address schainsFunctionalityAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsFunctionality")));
coverage_0x49c6355c(0x65b740858649b38b499a364fe9e99af19d02718a61191eb44e7c86a068d218fe); /* line */ 
        coverage_0x49c6355c(0x426e5332f90174d233a5a5dac08c222499767c93c068fdcf161f90b8cbe3a7af); /* statement */ 
ISchainsFunctionality(schainsFunctionalityAddress).deleteSchainByRoot(name);
    }

    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) external
    {coverage_0x49c6355c(0x155b6a8f97ae88da3bd76baaca7f85a49e6c9db82a63fc55a1c6b95f24a80e8a); /* function */ 

coverage_0x49c6355c(0x081613da3e6efd9550d4269f0e1b08a96e121448b110944aa15585074179c037); /* line */ 
        coverage_0x49c6355c(0xeeb62ce193cb0a38fa67e2589be93579050713e7008969e32f3fd45dcf05a9ab); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x49c6355c(0x5fc7a6c2c5027dc472d63039fd438887c81daa3ee9a0f9b16cfd4a1d9a756bb0); /* line */ 
        coverage_0x49c6355c(0xa49271469286b8740b7b9e812c2063f982012a8169e20f8476ff61c29c18fc83); /* assertPre */ 
coverage_0x49c6355c(0x669add77acf1d0d7c5be52917763329384229167672455fe15c041bff4f84d37); /* statement */ 
require(INodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");coverage_0x49c6355c(0x5b113b1832a38e14dada703c158192429c9e257dfa4700648663669d590284d9); /* assertPost */ 

coverage_0x49c6355c(0x834e18d3d61ea223aecb4cd75f767ed610efdc1206e6566629e2af421b5acf91); /* line */ 
        coverage_0x49c6355c(0xa6d4cbfe7b49200e4ced4eb5f3894bcb896a7d641a043371c6a9a173f0288ffd); /* statement */ 
address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0xbda33ec7e929d009492223ab62ae8000936f825002b6dcbcc9a248f5846d7d0c); /* line */ 
        coverage_0x49c6355c(0x92d9dcdadcae3ffff5e628453901f5b475442077388c1041181a7a06a7346be7); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(
            fromValidatorIndex,
            toNodeIndex,
            downtime,
            latency);
    }

    function sendVerdicts(
        uint fromValidatorIndex,
        uint[] calldata toNodeIndexes,
        uint32[] calldata downtimes,
        uint32[] calldata latencies) external
    {coverage_0x49c6355c(0x2200a1930ad5d585a375f560dc3ff701a123cd0584861ed55857bcc7a1cac78c); /* function */ 

coverage_0x49c6355c(0xb2f25f14fa80129dd6c08d4334668316c85a77b740936245134af8f35b13a913); /* line */ 
        coverage_0x49c6355c(0xc70e5acb88e926eb086e534e1cb096e1d772a628e7ede0a83090fab432fcbd0d); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x49c6355c(0x7ccf5ed8ed488673e310c32df7291093a47a6bad91cd7199676a89eefa9f7cf9); /* line */ 
        coverage_0x49c6355c(0x15889faa45af1d532ceeeaacf59b1a134df0b741768a7bce4e548bae76decd98); /* assertPre */ 
coverage_0x49c6355c(0xdcdbd3d7cf34684d19b35498067368fb1ae9c911def08cca27df531cc3486841); /* statement */ 
require(INodesData(nodesDataAddress).isNodeExist(msg.sender, fromValidatorIndex), "Node does not exist for Message sender");coverage_0x49c6355c(0x9bbb0f2d6343ae7371b6bc0f92e1a48e32eefb7ce6317c03dc6431849b552b25); /* assertPost */ 

coverage_0x49c6355c(0x814418480f7a6b27d8427c2d22584e8038c66513f3a72dcc96e30494c721fccc); /* line */ 
        coverage_0x49c6355c(0xaaafaa74f696a2b2f29c936d557f8ac2b1233ca5af83aaeff14f35ecf4d5addb); /* assertPre */ 
coverage_0x49c6355c(0x872cf5d665ddc27a3a128a8dc82bd8625319a22e9e2f91ed2ce07220df8796d9); /* statement */ 
require(toNodeIndexes.length == downtimes.length, "Incorrect data");coverage_0x49c6355c(0x80f9406f4351feb4f5eefeb1da0b9b7a12797c67edc8b4e2285bab25da1176d7); /* assertPost */ 

coverage_0x49c6355c(0x77b8b0011d3ff8fdb22f3f7c7c44328c3168b71d6cf8d3bfb5604edf371205d9); /* line */ 
        coverage_0x49c6355c(0xb2cc60bcf5a9909e1f0b2f511ab9515bc7ffa32b74e4d7adbbf4ba997441ca65); /* assertPre */ 
coverage_0x49c6355c(0x3f76b6ac4ab0e78d65464ce7f93e21e4dec0a07f837191fa9caa1560c20ada39); /* statement */ 
require(latencies.length == downtimes.length, "Incorrect data");coverage_0x49c6355c(0x2163bd7f5fa8d5e5bc5e0b63cd08e3e07d67767d6e84b3e592e542c6634863e3); /* assertPost */ 

coverage_0x49c6355c(0x5e95997c28983d05c555ae829958a62affba396fde242d71f69d20a8b26567d2); /* line */ 
        coverage_0x49c6355c(0xac3eebc6f8379914c29199c3eb08a31b0929c1b61de055b12552c6ab140b3491); /* statement */ 
address validatorsFunctionalityAddress = contractManager
            .contracts(keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0x179acf411b9057caec99e0dc6affa3702888cf246afd63de5fac51e3e4e8454e); /* line */ 
        coverage_0x49c6355c(0x609d90888442f6dd3f88477cae5e48763b783944abcd1876624773d54e20fd5a); /* statement */ 
for (uint i = 0; i < toNodeIndexes.length; i++) {
coverage_0x49c6355c(0xbcf57b8b2f290b2409f2fa456416ec9e28083697d0febcfd5aed1c4a528eb18f); /* line */ 
            coverage_0x49c6355c(0xbb4163dbdbc8224b3f7f975814c559bc6a0cb106f7706fd7e7dd4c0bd54168c6); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).sendVerdict(
                fromValidatorIndex,
                toNodeIndexes[i],
                downtimes[i],
                latencies[i]);
        }
    }

    function getBounty(uint nodeIndex) external {coverage_0x49c6355c(0x4a31fee7a0df3fe8e26fcfca89cde1eec1b72e5995d00d9702aa2b73daeee3cf); /* function */ 

coverage_0x49c6355c(0xb4121158b8dfd9be5be0f38664f466ba44ae6c39146876b484705d7bb100bde3); /* line */ 
        coverage_0x49c6355c(0x79a02159bad0ad12eca1d74cf1b65cb6d954d1c504ca6ba74b89069f49063154); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x49c6355c(0x41e91e56fe7b75ce71bf97cab2fcf6cf5f01d036730ff13959651c3f44f377be); /* line */ 
        coverage_0x49c6355c(0x1e1bcff3cf37206973352d06d8d9847a00995b91741acca2c5c6727a38ff608c); /* assertPre */ 
coverage_0x49c6355c(0xe68935bf432a3d91ae61b61b289b23a9e4bc13298304b1abb06fe6f86ab50fb6); /* statement */ 
require(INodesData(nodesDataAddress).isNodeExist(msg.sender, nodeIndex), "Node does not exist for Message sender");coverage_0x49c6355c(0x347a32abcdbf2d029cb2a3261206767f14f90e4d8b36b450080aff6e9a8408f5); /* assertPost */ 

coverage_0x49c6355c(0x45183520e4f4208803bf7128a8abfb30bef1eb89d64d93e66f2441615ca83c8a); /* line */ 
        coverage_0x49c6355c(0x7d1dc0993a96c45d09f1932003935341b0fe4e6518ddaf7e2e9ab3c76543aa22); /* assertPre */ 
coverage_0x49c6355c(0x17700ac572a07dbd6febaf7849ecace5c6583ed3c91a9e0f419b097354b11f57); /* statement */ 
require(INodesData(nodesDataAddress).isTimeForReward(nodeIndex), "Not time for bounty");coverage_0x49c6355c(0xa76e94ab6c2373f94520d7ed962c6a540822ac4d8eb38f4231af221c225bb6d4); /* assertPost */ 

coverage_0x49c6355c(0x9de14bf76fcb4a522acbfcca0a66b152e60919482ccc6d6faee81e01302352ac); /* line */ 
        coverage_0x49c6355c(0x357ff6174ff9117d0e9e14ef98c2d4d723036a7ac3bac1603f880e9d6a959418); /* statement */ 
bool nodeIsActive = INodesData(nodesDataAddress).isNodeActive(nodeIndex);
coverage_0x49c6355c(0x15e790baebbb2da75c0a75d9364fef85bc2dc2086ce70d96b4921a4e752048ac); /* line */ 
        coverage_0x49c6355c(0xcfae773833e1bb8fee2dc0b194a89c87542031cb1913425fbe48e6ba035264b1); /* statement */ 
bool nodeIsLeaving = INodesData(nodesDataAddress).isNodeLeaving(nodeIndex);
coverage_0x49c6355c(0x0c78e2d943889db3e31d0e8bc4bbc68abbf3ace86a88bebdb8f3a8bbf3442aeb); /* line */ 
        coverage_0x49c6355c(0x0595a98b28d13f3b293c168c2cbae177f9eac6b71b31c801822f923e61405882); /* assertPre */ 
coverage_0x49c6355c(0xfe33cedd39fe910c56f03dc024ad7758a4cdbf5a2454a5dd7d00a4db52328404); /* statement */ 
require(nodeIsActive || nodeIsLeaving, "Node is not Active and is not Leaving");coverage_0x49c6355c(0xfcd800b442c79d1912cb6d8d07722b27e758e6252e993b1435ab349a77165e8e); /* assertPost */ 

coverage_0x49c6355c(0x034dca2e3774c2215030be320d7bc072830b55b827ff767f2e3c493f90a70f49); /* line */ 
        coverage_0x49c6355c(0x4431faf1c64a688f1bc497a26666db437267dd6a102f1f3f0c47cb6e5f0e4ecd); /* statement */ 
uint32 averageDowntime;
coverage_0x49c6355c(0xf69cde63ffa20820f749712f2d06c5ba806c514a473fc1e9b1924a477cc6490d); /* line */ 
        coverage_0x49c6355c(0xc0d7f4e8c756d48a546bc1f5e9f2738cd4064d36479c0e2f02946ca5b559284c); /* statement */ 
uint32 averageLatency;
coverage_0x49c6355c(0x6d7c5e772e6105183013e78e9406189e0682766da179a7f342f65537333ba2f2); /* line */ 
        coverage_0x49c6355c(0x18222aea5943b610b94c016c0385240a12f1734bcc7140c0917d78be8564f968); /* statement */ 
address validatorsFunctionalityAddress = contractManager.contracts(
            keccak256(abi.encodePacked("ValidatorsFunctionality")));
coverage_0x49c6355c(0xd825f61ea1a7f72328a32b5f546fa8b772dbd4c90a32ce280583ed9d821777ed); /* line */ 
        coverage_0x49c6355c(0xb0207b4d97f0f3e30e60edff34ddd0150b283b6889c62e2e5d4353c8a5071aa1); /* statement */ 
(averageDowntime, averageLatency) = IValidatorsFunctionality(validatorsFunctionalityAddress).calculateMetrics(nodeIndex);
coverage_0x49c6355c(0xc8f8b716b281a09d0bd30b8a9cde16d6e1d64e5b0ed232c8666ec07f39a0180c); /* line */ 
        coverage_0x49c6355c(0xa9ee64a5e391b8601a71da8ca9668723a9462d18dbf9dc51113110dacb9e53c0); /* statement */ 
uint bounty = manageBounty(
            msg.sender,
            nodeIndex,
            averageDowntime,
            averageLatency,
            nodesDataAddress);
coverage_0x49c6355c(0x03145e2d4a497cc843d565d952edf68e37deec1ec209a2c81ce39e71f5cb44ba); /* line */ 
        coverage_0x49c6355c(0x15fd26f3e34accd5d834dadc153852873ffdad6be7fc7d08134fc0ecb597b5bb); /* statement */ 
INodesData(nodesDataAddress).changeNodeLastRewardDate(nodeIndex);
coverage_0x49c6355c(0xf0549acefaf5bd7425233482fc9b711e2bc6e2209ec352083bd011d8453f2965); /* line */ 
        coverage_0x49c6355c(0x09aa3ba03fbc2448e0d36fee901a88b7b553b87c73fbc8879344b744394d5fc0); /* statement */ 
IValidatorsFunctionality(validatorsFunctionalityAddress).upgradeValidator(nodeIndex);
coverage_0x49c6355c(0xfdcce90230439b808ac950077f2d938bbf91567561e2252a3ea609897baabaa7); /* line */ 
        coverage_0x49c6355c(0x1c505511fda12fc8dd2d2af1e2d24a65c24eecc0c80e902c318b515a014eb537); /* statement */ 
emit BountyGot(
            nodeIndex,
            msg.sender,
            averageDowntime,
            averageLatency,
            bounty,
            uint32(block.timestamp),
            gasleft());
    }

    function manageBounty(
        address from,
        uint nodeIndex,
        uint32 downtime,
        uint32 latency,
        address nodesDataAddress) internal returns (uint)
    {coverage_0x49c6355c(0xb935368b8cbb1d13b6df78aa81346849b5642c3ad20eee0ace2d0f65f139ca17); /* function */ 

coverage_0x49c6355c(0x4b02bd6922bdfc3b2b23da806f0c909fb8c828abd2d2c434cf552e85cb64a074); /* line */ 
        coverage_0x49c6355c(0x58de7d3b3dca617d111584abcb5aefb71bdafd234596275ad55878ad27d0b621); /* statement */ 
uint commonBounty;
coverage_0x49c6355c(0x7f64e531e2689c35b3c033d3a2a7f854db9bc197ff4bd12af11ef43a6aef5e8c); /* line */ 
        coverage_0x49c6355c(0x12176c462d07544b3ec946d40f934f265b46083733d0b57aeb764c0b74c19ef7); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0x49c6355c(0x384ca1a1f819fd73c43deea298294fc560ba69d07d3dc4444f2a8200c4ab67ed); /* line */ 
        coverage_0x49c6355c(0x8c7a68c0b4562781cb22cc48b4bd41e6546319f0e7bc20bcabac5b137c88e4dd); /* statement */ 
uint diffTime = INodesData(nodesDataAddress).getNodeLastRewardDate(nodeIndex) +
            IConstants(constantsAddress).rewardPeriod() +
            IConstants(constantsAddress).deltaPeriod();
coverage_0x49c6355c(0x9a237b27c8f70dab65d9966335912ce3cb22175e4ef5a518ed40a4c7d2c22248); /* line */ 
        coverage_0x49c6355c(0x3662dc74cb817ec8b1308526cf9a8299009bc2057978af625e274e95f9fdc2a8); /* statement */ 
address managerDataAddress = contractManager.contracts(keccak256(abi.encodePacked("ManagerData")));
coverage_0x49c6355c(0x8589cc761fa40ad1b224ec6114ee71b849c8746060de60db9199bdb590c5fdbe); /* line */ 
        coverage_0x49c6355c(0x36df137f9f8ff34a0dd9e15421625c017d5ab9772581449b1af2066eeae6ae4a); /* statement */ 
address skaleTokenAddress = contractManager.contracts(keccak256(abi.encodePacked("SkaleToken")));
coverage_0x49c6355c(0x064d077e614c3904fa377ef5e6ed38e10f29a0e4e7b06556c9089d5643247d37); /* line */ 
        coverage_0x49c6355c(0x945e38f96a7b8efac0da196e9d7355cb84efdeb9b1df0f531611b96e912a98c9); /* statement */ 
if (IManagerData(managerDataAddress).minersCap() == 0) {coverage_0x49c6355c(0xa61629672098a1ae0289dbcc8c873e77733a75856cb13713a6fe1b99335a41fc); /* branch */ 

coverage_0x49c6355c(0x50333ca59db846190bfb955ce8a4a368429f2bf872da67b92cdf98c798138c86); /* line */ 
            coverage_0x49c6355c(0x74cf5248834981c1731790586873fc67658986df9a109ac742bbec48c282268b); /* statement */ 
IManagerData(managerDataAddress).setMinersCap(ISkaleToken(skaleTokenAddress).CAP() / 3);
        }else { coverage_0x49c6355c(0x5672cb35bfe56d71c6f8a0a465cddc0053009ecc3d0f24c92c2ddd7b43a300ca); /* branch */ 
}
coverage_0x49c6355c(0xe6d2fe3a40a7ce90e65d802bf6d8bae14961fa5936ede1d73477fd4077e45139); /* line */ 
        coverage_0x49c6355c(0x3fe961808ab0d325bd084c6d98d81d7527d3620bd55694557d5efacffa5d5051); /* statement */ 
if (IManagerData(managerDataAddress).stageTime() + IConstants(constantsAddress).rewardPeriod() < now) {coverage_0x49c6355c(0xffd3d13ea4276cf8e0d3835cee5b2bb1144402ffdbe3ca53a72e9a8947d5e3c0); /* branch */ 

coverage_0x49c6355c(0x47e5a54d2a64f68782fe7b96b53009cc8fff6179b4633d8823313e81dd334b58); /* line */ 
            coverage_0x49c6355c(0x42f34cbfddfcafbc2e0d21a64b988bc20683a04331dc290f76c526a7586ceef3); /* statement */ 
IManagerData(managerDataAddress).setStageTimeAndStageNodes(INodesData(nodesDataAddress).numberOfActiveNodes() + INodesData(nodesDataAddress).numberOfLeavingNodes());
        }else { coverage_0x49c6355c(0xcd267070975574bc2a232f6d06e987148e887e86143c09124e422df0f2eb1edd); /* branch */ 
}
coverage_0x49c6355c(0x75cc5412bb2e587a6af12274ba662d02977893c3a0ce07c4a0098744eb06badf); /* line */ 
        coverage_0x49c6355c(0xe1ab7fd94fcc616bcf4b3dd953862ccbfa358b2bc4663cb7889cfc5a6c3169a8); /* statement */ 
commonBounty = IManagerData(managerDataAddress).minersCap() /
            ((2 ** (((now - IManagerData(managerDataAddress).startTime()) /
            IConstants(constantsAddress).SIX_YEARS()) + 1)) *
            (IConstants(constantsAddress).SIX_YEARS() /
            IConstants(constantsAddress).rewardPeriod()) *
            IManagerData(managerDataAddress).stageNodes());
coverage_0x49c6355c(0x5d08b250a1f4df6ae029d1c7ee05e38cfc8ab983bca6e67277da2fb23c6a28ea); /* line */ 
        coverage_0x49c6355c(0xc6866c7ad0088d923a09b2536bc96247e23eecddbad2559c03641cde3e1993c1); /* statement */ 
if (now > diffTime) {coverage_0x49c6355c(0x44268fb16861e9e74ffaa063acb9ff3301dc0e61e0357ebb373f7dfa918a4403); /* branch */ 

coverage_0x49c6355c(0x1e394728b46672fb82725d4459613118915ad08fb37b3946fa1820676c943c01); /* line */ 
            coverage_0x49c6355c(0x261250cb2c52f08d07a5559a02c1aef53528300ee8028fcf9ae0d1943061b564); /* statement */ 
diffTime = now - diffTime;
        } else {coverage_0x49c6355c(0xc2cc32af9bbdfa01b50c8ca5757f9d51cf3185e03ca915946a4ea534bcba76a7); /* branch */ 

coverage_0x49c6355c(0x97b4e8386ddcdb082cc2651d6a5d526cdd4fe47a46ec1bfe106cfcca1d4385dd); /* line */ 
            coverage_0x49c6355c(0x7dc4ededa9abc2b2c74dc269f065a34e7e428bbd62e009f607d1574c5ecfdb59); /* statement */ 
diffTime = 0;
        }
coverage_0x49c6355c(0x35ce61f00b83affe657b416b0eeb6fa2bf325adcac1a340602269ce4a5580a1c); /* line */ 
        coverage_0x49c6355c(0x9e5bfc070a11b7ddcef8b404864b8ebd3f9b5782770590823289fe2e126e4d05); /* statement */ 
diffTime /= IConstants(constantsAddress).checkTime();
coverage_0x49c6355c(0x3058e543afde11ca1a5a1fdca768e6a1d789b0de156d1e10f22a3b54fff4217a); /* line */ 
        coverage_0x49c6355c(0xc2b0b47818b7bdf90f749ba0a13ba363f52f2f91428c64f339e9e4841406d79d); /* statement */ 
int bountyForMiner = int(commonBounty);
coverage_0x49c6355c(0x85cfebe13ad48f555cd4cea5041da7948eb7e8bd30fae28b7d39740745fddf9b); /* line */ 
        coverage_0x49c6355c(0x5b2054165329f6eac336686ed9aafd1bed274cb1885b34d3b551260973eb050d); /* statement */ 
uint normalDowntime = ((IConstants(constantsAddress).rewardPeriod() - IConstants(constantsAddress).deltaPeriod()) /
            IConstants(constantsAddress).checkTime()) / 30;
coverage_0x49c6355c(0x61f5f79f8a36222d7c611e8d9461ff4c71561e555fb9d96ad639d9fdfe15ca5c); /* line */ 
        coverage_0x49c6355c(0xa817918dca427d6099da92c61ce2f82004f14fc473009cf3024c14c555a93ed6); /* statement */ 
if (downtime + diffTime > normalDowntime) {coverage_0x49c6355c(0xcbd9964c4e6a8dd35255430ccf15c7621959ba6daf46c50b576f4c34d24a4192); /* branch */ 

coverage_0x49c6355c(0x81791ed901f7ac713a9d1788c0aeb77d55bba1bcb003b9b25954e8525dbdd3a1); /* line */ 
            coverage_0x49c6355c(0x6bcf0939dc55a9477c7625856865166eb7b963471a02f5c1c29c923a5fe34734); /* statement */ 
bountyForMiner -= int(((downtime + diffTime) * commonBounty) / (IConstants(constantsAddress).SECONDS_TO_DAY() / 4));
        }else { coverage_0x49c6355c(0xd33ccb913b9f4b149cc3204bda366922fd66c5ec9d2071b5dfa34d452ddaef38); /* branch */ 
}

coverage_0x49c6355c(0x92ff448b5590cd286d701fe572c0026c578a110fb5b3934a883578fe8d0e1ca8); /* line */ 
        coverage_0x49c6355c(0x80c947a331caab634f830be1a6d7cf7f5dc00850049bafd0c06f3097c9c58755); /* statement */ 
if (bountyForMiner > 0) {coverage_0x49c6355c(0xe57164a57bf404c5d3add455d1108ff9b937f7bc584fc57004805cf9d255573f); /* branch */ 

coverage_0x49c6355c(0xdd49d073c4b4bda787db85293df9c123dd0fcd9c5bcd8f60690c76312f480f21); /* line */ 
            coverage_0x49c6355c(0xe99c4608fdfad93542ffb30e79ebf4811b2c0cb1bd359b612f333a0198f8ac90); /* statement */ 
if (latency > IConstants(constantsAddress).allowableLatency()) {coverage_0x49c6355c(0x1a099f0abcab9c3a6d45a15c572515a4337c937f9453a425cdd5da22897a919e); /* branch */ 

coverage_0x49c6355c(0x6843fd875446769002f7f42f031b7db5c25696c7c5f9c8508e3e47d220c81b40); /* line */ 
                coverage_0x49c6355c(0xea25df6df3850178a93792d984421814a2657c27b4d9afd37928fb639ee6f534); /* statement */ 
bountyForMiner = (IConstants(constantsAddress).allowableLatency() * bountyForMiner) / latency;
            }else { coverage_0x49c6355c(0x1a05c86fddb3f2773665cdae8919cddd2ac598333ca6d2b6fbb479bae1cf91e0); /* branch */ 
}
coverage_0x49c6355c(0x59b6607f969bd1cb66265f81116c6d92aecb997bd3f0c858ee4acff0bc303e17); /* line */ 
            coverage_0x49c6355c(0xda67688cecdf38542185148da01be8c6b9ab99a82865ae760b61614aea675786); /* assertPre */ 
coverage_0x49c6355c(0xbac2ec82192e1bafe8b5b98ddc2ca34db122d6196540010f4da534b72eb2719c); /* statement */ 
require(
                ISkaleToken(skaleTokenAddress).mint(
                    address(0),
                    from,
                    uint(bountyForMiner),
                    bytes(""),
                    bytes("")
                ), "Minting of token is failed"
            );coverage_0x49c6355c(0x3117e8f7fb617e4b7291dee88ae5513edca91143d1471bd4c337a039dbc1e906); /* assertPost */ 

        } else {coverage_0x49c6355c(0xd2bf9149d4f60dfe50225e16fbe1a0b31fac4fb0d1b24378f10cc3c714f64a0a); /* branch */ 

            //Need to add penalty
coverage_0x49c6355c(0xca759123a6bcbd9fc1d071bcddd64410befaf1b9fbe57dc26aae343017554e19); /* line */ 
            coverage_0x49c6355c(0x4da6e367612956654141da0559c3c2961572da7986dd2c7d1ef99730da8e9195); /* statement */ 
bountyForMiner = 0;
        }
coverage_0x49c6355c(0x0e10b181fcdeb81befa533d2a6a9fbd2fdedc14f5053bc00e93b6fe0d615608e); /* line */ 
        coverage_0x49c6355c(0x18ef346cf04a10cff703d5b01854ccc92f32e03b10e337e137ba0fc80d44c9c8); /* statement */ 
return uint(bountyForMiner);
    }

    function fallbackOperationTypeConvert(bytes memory data) internal pure returns (TransactionOperation) {coverage_0x49c6355c(0x59cef5963981d4801fbc4076aea2c337c10122b317a36d3997e96c1b5fe4db25); /* function */ 

coverage_0x49c6355c(0x5b102f70b9f37977526d72ada7d1e1d36c9bd43ac05f759a245fe379baf125c0); /* line */ 
        coverage_0x49c6355c(0xb2113085e0e27f8340d77adc704bbeb314e4c0dd902da26ddca90313c6d09447); /* statement */ 
bytes1 operationType;
coverage_0x49c6355c(0x11c3bc8cbd57de38780b2ad1cc53b5529ecace8ac2fd1d13dda1896b2a637c47); /* line */ 
        assembly {
            operationType := mload(add(data, 0x20))
        }
coverage_0x49c6355c(0x3beef034235fe39199226091daacbc1917eb47d3394d95b866f4a5c47d31308a); /* line */ 
        coverage_0x49c6355c(0xff34e5717c375d65b9b732ed5c2b5670f331185caa82820c21f6fb7039842503); /* statement */ 
bool isIdentified = operationType == bytes1(uint8(1)) || operationType == bytes1(uint8(16));
coverage_0x49c6355c(0xac67155df4491da931cf9c4da2f214aad31da2a515a4b6c08ad594e575e84aa3); /* line */ 
        coverage_0x49c6355c(0x7ab305f8f71ac2ed69f72cc93e028919d9e5eac8d721c437e4a4b3862908d335); /* assertPre */ 
coverage_0x49c6355c(0xead63839274fa28e2937de1ea4554ea32834eb2ae8f7cf9469c30329577470e8); /* statement */ 
require(isIdentified, "Operation type is not identified");coverage_0x49c6355c(0x1a0d1b0a2722aa2ba417c9707de4e7db220fd2da2891f0ba5ab8dc50e84c4874); /* assertPost */ 

coverage_0x49c6355c(0xd67bd0f88c44ef102e95d364dbc5e6d98d89b4914bd233dc5f7fc4ce3b12df98); /* line */ 
        coverage_0x49c6355c(0xfa5ede927956624abf03437f36d2b6704ce0c8806999ffa1617dad21d330e223); /* statement */ 
if (operationType == bytes1(uint8(1))) {coverage_0x49c6355c(0x03158322bcc0d6f8d2121b3f9228688b239eaa5d9179521c0a18cf7f2f79db19); /* branch */ 

coverage_0x49c6355c(0xb985c3fbc701a487587389c2e971be167c442ca6dec16379964ae9a34c32233f); /* line */ 
            coverage_0x49c6355c(0x7d9c1daf442aa2fa312f98ca1f767e1b4a0717ca9bd0eb9b8ceb6fbf1b396e95); /* statement */ 
return TransactionOperation.CreateNode;
        } else {coverage_0x49c6355c(0x0055ad5d370526362c2ff2d2f08f664c3534458e39f02c4c010d064f2fd70181); /* statement */ 
coverage_0x49c6355c(0x1f43bc07741e0ceb740321d09020105f9f70e6afcd4db5d6d6bd31026f927bf4); /* branch */ 
if (operationType == bytes1(uint8(16))) {coverage_0x49c6355c(0x17785d0cd0ab0d9a8f346fb5e27a371188ecd1a93878dd8debc2cd6d2eeab324); /* branch */ 

coverage_0x49c6355c(0xbc1e61f49bba04714c66b01017380f2a5359c1d139459bcda7b09443e784b021); /* line */ 
            coverage_0x49c6355c(0xcfb49db730f984c0811658d6b33cbad109b4b5e683a29974d23726ca2fb95154); /* statement */ 
return TransactionOperation.CreateSchain;
        }else { coverage_0x49c6355c(0x95673d84394cd74a9082fff4c6b80334339a3e7b03f779550db5f546e217cc0f); /* branch */ 
}}
    }

}
