/*
    Pricing.sol - SKALE Manager
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
import "./interfaces/ISchainsData.sol";
import "./interfaces/IGroupsData.sol";
import "./interfaces/INodesData.sol";


contract Pricing is Permissions {
function coverage_0x5e187ee9(bytes32 c__0x5e187ee9) public pure {}

    uint public constant OPTIMAL_LOAD_PERCENTAGE = 80;
    uint public constant ADJUSTMENT_SPEED = 1000;
    uint public constant COOLDOWN_TIME = 60;
    uint public constant MIN_PRICE = 10**6;
    uint public price = 5*10**6;
    uint public totalNodes;
    uint lastUpdated;



    constructor(address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x5e187ee9(0x1534456a8973f1c7b0d66388276fc0414ff6f4e1ee6ca349e9770994bd2a4020); /* function */ 

coverage_0x5e187ee9(0x34de4df08e1abf15673e41914688ff7f752f0525e069b6344076bcecbb5acd52); /* line */ 
        coverage_0x5e187ee9(0xb489047486210547c90061809b5f2ac6240628d274c59c50f0a7c8d0f7cd6dfd); /* statement */ 
lastUpdated = now;
    }

    function initNodes() external {coverage_0x5e187ee9(0x36526cca796d722dbd189d5ade03ec7094026c8918ff260690133935be034d0e); /* function */ 

coverage_0x5e187ee9(0xf08a844b19426f839352779c5b4733dbfcd2cefe024c50ce2f5cc8ddb7942d94); /* line */ 
        coverage_0x5e187ee9(0x47134875adbc8b9f2264e3f7d44182fc9f816a20d918fdc6843c33e2f4d10504); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x5e187ee9(0x09a92a00f1418574f8ac9b159b5669378bd8e5a39243dc1fa9211023fc5f9ed7); /* line */ 
        coverage_0x5e187ee9(0xf55c18e051bdc0af6880c21f7eb7ecf5fa03bbd19e2846f8c0cabd6e4794cb0d); /* statement */ 
totalNodes = INodesData(nodesDataAddress).getNumberOnlineNodes();
    }

    function adjustPrice() external {coverage_0x5e187ee9(0xb9624062f844adac55fa0ede06cf7fb22d9f202099bb846d5d67e3f456913422); /* function */ 

coverage_0x5e187ee9(0x75c67b29c6e4518c7d1f3c227d3c1db12a5926a2210fbdb5759cd64c119d0fba); /* line */ 
        coverage_0x5e187ee9(0xe5a63216a7a32e8c168343790192eed38bcc08d52002e22bb7dc0f6c65d8f3af); /* assertPre */ 
coverage_0x5e187ee9(0x13c090027d99c7a7c9591bafd0ecd5855350cb35c574c51dc3e9b628ad340020); /* statement */ 
require(now > lastUpdated + COOLDOWN_TIME, "It's not a time to update a price");coverage_0x5e187ee9(0xef4f3ca7fca0e92161da6bcdbc801a65af0230920d53b98de55b7451a8ac0a8d); /* assertPost */ 

coverage_0x5e187ee9(0xb96e3d4fae146cba25e0ce7cbd91f776e4a54d72ff9708d88ececd7820ad9c3b); /* line */ 
        coverage_0x5e187ee9(0x867a9f1a00f59b6beb0c3161991d1549e6940462d5590d834da2527cd4594cdf); /* statement */ 
checkAllNodes();
coverage_0x5e187ee9(0xc677f5be0edf311b350f88a9f36d5af21978c4392c3f594ee1be9c6f9019e37a); /* line */ 
        coverage_0x5e187ee9(0x9c51dbc8fb7c2526efb674a29fcce946427e30b8e853ae831b173c0f57198873); /* statement */ 
uint loadPercentage = getTotalLoadPercentage();
coverage_0x5e187ee9(0x3ada6fc89a81e0b5e4eb48b470699f1d58ee272abfb01f31fb684004ae8b852c); /* line */ 
        coverage_0x5e187ee9(0xdc59002b48c638fb617da044beed10d4a8b51219f1e150ee8ccd1268124b1db1); /* statement */ 
uint priceChange;
coverage_0x5e187ee9(0x9b712d2bf46aa378c7ab1ffe16d957d48c3c972b237bb1726ae159e76d96b65f); /* line */ 
        coverage_0x5e187ee9(0xd11c8b25a368a718ad3018eea7c358740681a75b1fa1671a670c65b43d21dece); /* statement */ 
uint timeSkipped;

coverage_0x5e187ee9(0xdfe1b5dd489ce5df79725415c83726d0cfafebc38a6c24322735df6beddcfd76); /* line */ 
        coverage_0x5e187ee9(0xaeabb3ec850e47cd81a113d201cb2bf297658d2eba2fcfce778a874bcd942539); /* statement */ 
if (loadPercentage < OPTIMAL_LOAD_PERCENTAGE) {coverage_0x5e187ee9(0xfc6834136696df8a26598da3fbdd06eda9cb644a1dd3ec39b54f467ff56ac324); /* branch */ 

coverage_0x5e187ee9(0x96b87ee13cf5531f7a5af0b3c4c88a2af91b7049f2ced9df4ad95ef036eb0b1a); /* line */ 
            coverage_0x5e187ee9(0x3c5b4ce25a40db4e0f01edaf20414ac64f9156a23bbb606394bb50bf66d7434f); /* statement */ 
priceChange = (ADJUSTMENT_SPEED * price) * (OPTIMAL_LOAD_PERCENTAGE - loadPercentage) / 10**6;
coverage_0x5e187ee9(0x83f1537e5b8f9b7b51e868e684acbfa3df605ba260a379f52fd98a7db7997ce3); /* line */ 
            coverage_0x5e187ee9(0x9408574c7e729fd6b32b2da496441b6f0c96501e48ae79948e0941378ed5d1fe); /* statement */ 
timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
coverage_0x5e187ee9(0x9251be5abfe974af99e381e76f3c9027a31acf88a5b45ea7a57abad89c8c1ab8); /* line */ 
            coverage_0x5e187ee9(0xbc79817b329130ab4b657baaa1e27912d142a47b54b70da0a93f9170ce7551c8); /* assertPre */ 
coverage_0x5e187ee9(0xc35369eef5800502bc5f50ad434490fca5517d694b588696d2bf2bf56dd7efb7); /* statement */ 
require(price - priceChange * timeSkipped < price, "New price should be less than old price");coverage_0x5e187ee9(0x4c32cd0aa370ab7a6df9639396f2f939fa7b9a5cac1febebec269f0ae7b5f3df); /* assertPost */ 

coverage_0x5e187ee9(0x16031ca8c07474b0c3f35eebaaa703493826328527fd7c8bfd94ec51e98cee66); /* line */ 
            coverage_0x5e187ee9(0xd1adb4f60dba2dcd032987b805e8428e762fea04bd4661456aa7bdb18a5f0b66); /* statement */ 
price -= priceChange * timeSkipped;
coverage_0x5e187ee9(0xf59014295bf2d46a2a2935256cc46639792fc967da8c3537bd4fed8c11953327); /* line */ 
            coverage_0x5e187ee9(0xaf22c810b249ee6656f8d93eda8d6df889f0da9de791cd7e9ef014e371fc7556); /* statement */ 
if (price < MIN_PRICE) {coverage_0x5e187ee9(0xa7972afb85470ff2ce0124f312180be370ead8b66218cd1f33c5bcd29adb7c37); /* branch */ 

coverage_0x5e187ee9(0xc22a8411f9cd1031aaafc2cb8e69139bb01258f714e55ee54c6f3f7eeb449608); /* line */ 
                coverage_0x5e187ee9(0xcbf6e123739dcd15e20509bd8b34998bb6cf7dd46ce9404a8657ad7c75288af6); /* statement */ 
price = MIN_PRICE;
            }else { coverage_0x5e187ee9(0xc409ce4df44611f393ec8e37f44ca6398ca68709063018d407bbfe26d6d8e2a0); /* branch */ 
}
        } else {coverage_0x5e187ee9(0xf0162e302c4bf1b60978b9063ce8e0cde06e44d38a2d751ec7c73f709525a312); /* branch */ 

coverage_0x5e187ee9(0x2e580eadfe6315cc8be0f863c52b2f8f1c40f2faadab5cbdbbf311892e125362); /* line */ 
            coverage_0x5e187ee9(0xd8b5083e7d09193ae9591f803b4fad8ce54693fd8a3f8589a79d301d548e291a); /* statement */ 
priceChange = (ADJUSTMENT_SPEED * price) * (loadPercentage - OPTIMAL_LOAD_PERCENTAGE) / 10**6;
coverage_0x5e187ee9(0x20a32d785f5a4e691249e98690de9c3f7d909f937e70047965e7538fc923a300); /* line */ 
            coverage_0x5e187ee9(0x510d07b55d28a79ad46dbc6a7ab56607c6de9cd93c0eba56612b67a1f8b4ce49); /* statement */ 
timeSkipped = (now - lastUpdated) / COOLDOWN_TIME;
coverage_0x5e187ee9(0xd5f431b5e69ca3f558a3dc9e1e463595b5b0c287ae4a3ba25238cef2558c102a); /* line */ 
            coverage_0x5e187ee9(0x743d4b8999c2e0d96c8b3e2a63fe96cc7f1414837b9fe4bded96a473fdb5f9f3); /* assertPre */ 
coverage_0x5e187ee9(0x0e5fd951638473236a2319cc6bab94a57b18900a1e90204235f0ba8da8638231); /* statement */ 
require(price + priceChange * timeSkipped > price, "New price should be greater than old price");coverage_0x5e187ee9(0x91e1b23a0e0845a5e8fe95526654eb71f06a3f75c5f8d06079510345eed3a71b); /* assertPost */ 

coverage_0x5e187ee9(0x0940054530f87edeb2bd64c89735fa4446cab00f22d93581b5f978779ca4445f); /* line */ 
            coverage_0x5e187ee9(0x23f5226c2d158ef6031637827c906cbb54b7a3e213b41dc8a6230e5327a93452); /* statement */ 
price += priceChange * timeSkipped;
        }
coverage_0x5e187ee9(0x4f48b7e2e6c8ef66524e55c399ff01272bd7b02c8cf77817ff1372395ff8628e); /* line */ 
        coverage_0x5e187ee9(0x2074d776bd146524a2de26ee0dfae82652553ea3ce1546088d80a8ff9d05cedc); /* statement */ 
lastUpdated = now;
    }

    function checkAllNodes() public {coverage_0x5e187ee9(0x753b580ed3201f0c5f0c87974e807da333a1f3de7b7bae05819b52a92eb19a30); /* function */ 

coverage_0x5e187ee9(0x656dad56da4e5e18b59e1383abe27f52711e5df22da8ec1411dacc3dc32a9c86); /* line */ 
        coverage_0x5e187ee9(0xe630ed00e2d71e1f0004d8475e2864183c2fb7de4f8874ad4a95d77a99fecc46); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x5e187ee9(0x7d5ab58556cc94462758546712612dc74b1e2bdf8f6bc0a46a810194f9901d73); /* line */ 
        coverage_0x5e187ee9(0x74bb89d61d03bafe21500cd1b78e43fd15e36e49a18cae08d7b8b152cdc1e329); /* statement */ 
uint numberOfActiveNodes = INodesData(nodesDataAddress).getNumberOnlineNodes();

coverage_0x5e187ee9(0x43c736322314ca147e4cc7d41efd283682c1ac0e155f7949fafac739c16060a7); /* line */ 
        coverage_0x5e187ee9(0xd1012dfa48d81f53eb0c7027390e59cc5455798dc4a63d9c4e5bb3d043b481cb); /* assertPre */ 
coverage_0x5e187ee9(0x05e3e91b8baf643187f63cdd78736e1e8cd1696604b3458a073825357be7774b); /* statement */ 
require(totalNodes != numberOfActiveNodes, "No any changes on nodes");coverage_0x5e187ee9(0xfab1af42c323b78a41f7a7c61b93891a00ee26154987cc1c0776fc47e598ea1a); /* assertPost */ 

coverage_0x5e187ee9(0x0f70817e7c8874fe1af9b8d8da5d33677202c6ab679986fe5888f96123fa2012); /* line */ 
        coverage_0x5e187ee9(0x59089c9725664d1281c79e6debc19ab5871f1c2e729d36e4d6e7ef0d109c977f); /* statement */ 
totalNodes = numberOfActiveNodes;

    }

    function getTotalLoadPercentage() public view returns (uint) {coverage_0x5e187ee9(0x4fce792fd355d9af78e733ebdd6a26b0613b217400442b2f7671925133d2d992); /* function */ 

coverage_0x5e187ee9(0x252353530264839e8d977a6031a28ba58eba955bbeb484037be593c11d1c0bf2); /* line */ 
        coverage_0x5e187ee9(0x63e0eb442018eb4e4f0f718edfc4053fc048f20caeba38a7bd961504fb22888f); /* statement */ 
address schainsDataAddress = contractManager.contracts(keccak256(abi.encodePacked("SchainsData")));
coverage_0x5e187ee9(0x9a8fe88c4209fd0991bb894c2ccca7eb613905893eef9bc99f8f0a0220889f96); /* line */ 
        coverage_0x5e187ee9(0x862e8762149b31f8497da346da6f708ffea16d77a475bdd263bfb24b2df73bcc); /* statement */ 
uint64 numberOfSchains = ISchainsData(schainsDataAddress).numberOfSchains();
coverage_0x5e187ee9(0x8e6040cb0eddbdaae925a237d2503712228b912b1b9e1676c29dbfe95b07839d); /* line */ 
        coverage_0x5e187ee9(0x8c8f5c31d6400dea5aa4f0af51bf8317ad8af1bd751da020ececa79e2d4ca6b7); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x5e187ee9(0x51694807c62f488b54a35934637d38a4283ef903d4e07084bf0c2e5d30aedcf1); /* line */ 
        coverage_0x5e187ee9(0x84dcb9f89cfe07db871fb12185e2c021af457be5275e5b83ef7f97bc7f8554cc); /* statement */ 
uint numberOfNodes = INodesData(nodesDataAddress).getNumberOnlineNodes();
coverage_0x5e187ee9(0x5596049f1aa01727d0fa42eb458d7ca1a4f4bce90fbb3fdab434b716ff3161f2); /* line */ 
        coverage_0x5e187ee9(0xd914874fcd66645ed95464e7faab20ae080aeeb52c525bd3d25b265d2790df2a); /* statement */ 
uint sumLoadSchain = 0;
coverage_0x5e187ee9(0x53fefd1121a1bab974a873f2ac3ae04874c86b34c98b3a3c5b10d84e31d52dde); /* line */ 
        coverage_0x5e187ee9(0x1694af831c336ac6d4871dcafed3116dd918f73370e2d25f1922af92d9c53346); /* statement */ 
for (uint i = 0; i < numberOfSchains; i++) {
coverage_0x5e187ee9(0xcc031a462c7dbd112afc64654a0f9f8ade969f413131b545168f2d6758e0c6e9); /* line */ 
            coverage_0x5e187ee9(0x987e4ea21641bbfbdefc30daaf0fe76b8d25adfd756c7a516daa7316d0b8ed51); /* statement */ 
bytes32 schain = ISchainsData(schainsDataAddress).schainsAtSystem(i);
coverage_0x5e187ee9(0x2642cccfa79c9f4e06e11aee0b1a2d748c2453d46560f56a6840d24190d461db); /* line */ 
            coverage_0x5e187ee9(0xcdf7c6dc829b3e6a983175bf0d2270884f6a165c0d5bee6b393c7ae68f5fcf02); /* statement */ 
uint numberOfNodesInGroup = IGroupsData(schainsDataAddress).getNumberOfNodesInGroup(schain);
coverage_0x5e187ee9(0x4bdf30dc7aee912b5ce7dd80545590954ecafd38bf65335ef4a835163dd3a2ad); /* line */ 
            coverage_0x5e187ee9(0x008ba108206db1ce846a150e7ce54d2eff8975db67109be8ba8f069bbb04bc61); /* statement */ 
uint part = ISchainsData(schainsDataAddress).getSchainsPartOfNode(schain);
coverage_0x5e187ee9(0x2c53f66b0d081380a540136c241b8e377d288cfae76b6ba7871cddf8efb31165); /* line */ 
            coverage_0x5e187ee9(0x6665c9a45e91e111f2fe66b80680aefa225987aab5814742857f4f3cea991c88); /* statement */ 
sumLoadSchain += (numberOfNodesInGroup*10**7)/part;
        }
coverage_0x5e187ee9(0x84b1436744176a0c9753eeab62970220116b1b303e9b4dcba0f06d4b784ae561); /* line */ 
        coverage_0x5e187ee9(0x474a6e3acd55985b8cd17cf80e79bd8d2246173f1509baa0bc82ac2d0cce2004); /* statement */ 
return uint(sumLoadSchain/(10**5*numberOfNodes));
    }
}
