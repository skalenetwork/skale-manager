/*
    NodesFunctionality.sol - SKALE Manager
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
import "./interfaces/ISchainsData.sol";
import "./interfaces/INodesFunctionality.sol";
import "./NodesData.sol";


/**
 * @title NodesFunctionality - contract contains all functionality logic to manage Nodes
 */
contract NodesFunctionality is Permissions, INodesFunctionality {
function coverage_0x5ed5e296(bytes32 c__0x5ed5e296) public pure {}


    // informs that Node is created
    event NodeCreated(
        uint nodeIndex,
        address owner,
        string name,
        bytes4 ip,
        bytes4 publicIP,
        uint16 port,
        uint16 nonce,
        uint32 time,
        uint gasSpend
    );

    // informs that node is fully finished quitting from the system
    event ExitCompleted(
        uint nodeIndex,
        address owner,
        uint32 time,
        uint gasSpend
    );

    // informs that owner starts the procedure of quitting the Node from the system
    event ExitInited(
        uint nodeIndex,
        address owner,
        uint32 startLeavingPeriod,
        uint32 time,
        uint gasSpend
    );

    /**
     * @dev constructor in Permissions approach
     * @param newContractsAddress needed in Permissions constructor
    */
    constructor(address newContractsAddress) Permissions(newContractsAddress) public {coverage_0x5ed5e296(0x3fbc0b7c852357b38f557f270543b93407b4a1455213814f5b03573b43998746); /* function */ 


    }

    /**
     * @dev createNode - creates new Node and add it to the NodesData contract
     * function could be only run by SkaleManager
     * @param from - owner of Node
     * @param value - received amount of SKL
     * @param data - Node's data
     * @return nodeIndex - index of Node
     */
    function createNode(address from, uint value, bytes calldata data) external allow("SkaleManager") returns (uint nodeIndex) {coverage_0x5ed5e296(0xec2890bbbb7916cde102a734eec7e4ed5a7ccc1c9514dfcaaa518a359ab99820); /* function */ 

coverage_0x5ed5e296(0x6a58d96d314b1ae5113a73adb2d36ccf9140776d000e7d5c106c8af0cbd72637); /* line */ 
        coverage_0x5ed5e296(0xfd1a84ee1af4ed74b783e394a23bd6897fcd0003ff287f9ef728bc1b8248dcd0); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x5ed5e296(0x0ad704f913ccc22b5a41e06a33e828087126d8daa01851f48ee1372f8701a41d); /* line */ 
        coverage_0x5ed5e296(0xacc32023db3c981fc3a2be4b18f42cd7e0068f493ff225ccda2b91760595bbf7); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0x5ed5e296(0x2c35000cb99faae5d1c898c8a5e3caea2cbab8ea9d6dd6b5a6b7de4f314cd2d6); /* line */ 
        coverage_0x5ed5e296(0xc99a3a05dbc28d387c31b6d88d4732f0cd0c2b28f062f2b8c2f6ef1416d49d1b); /* assertPre */ 
coverage_0x5ed5e296(0x115f927c7d2a09571ba283116c3fd47003987fb85af5acbfce111bc1e8a14054); /* statement */ 
require(value >= IConstants(constantsAddress).NODE_DEPOSIT(), "Not enough money to create Node");coverage_0x5ed5e296(0x2351dd55e881cad33425a7ae56562873eec7d8c874382a3dcdde0d59c90468a0); /* assertPost */ 

coverage_0x5ed5e296(0xda2cfe64b79ada0aa14dd424360a5c660b9ccddae576a9927fd4fec44ac0cc52); /* line */ 
        coverage_0x5ed5e296(0x22c238823898e3396287c136d79581d5d49484f33a3cde10802417fe7e38c73c); /* statement */ 
uint16 nonce;
coverage_0x5ed5e296(0x0037475017097a98ad839fb06eed87a9e1da52819751ce5d1e77daaa758269ca); /* line */ 
        coverage_0x5ed5e296(0x80abd2f40583c88463c2528a3fc8e45af42b84e3380a8e12a2ca0e0d7cea5c55); /* statement */ 
bytes4 ip;
coverage_0x5ed5e296(0x7189ef5d582266f60f0f62833309cb476a287f34197eb82acd1586091ba37f4d); /* line */ 
        coverage_0x5ed5e296(0x1dea057caac35d71e56c467cbef82068a9decc11b5be99a7a0b4dc47210b9375); /* statement */ 
bytes4 publicIP;
coverage_0x5ed5e296(0x473aa3c4c09ae0f4bbf1b457dc4b800df3344e4a3adfc6cb03723e59182fe48c); /* line */ 
        coverage_0x5ed5e296(0x8cc46e3435ae1f40e8eb5cef8842c9b0d600e3327bbab37ddec3c2242f38a6fd); /* statement */ 
uint16 port;
coverage_0x5ed5e296(0xafeae4b8ec1114dc131f5efc107197d9bf85d01acf88469e28138bcbfbb4ee8b); /* line */ 
        coverage_0x5ed5e296(0x5c9482ed80e52836683dcd4c43015732b547c2c7008fdbc6dffa12e8c9716c7e); /* statement */ 
string memory name;
coverage_0x5ed5e296(0x0d9a331ca2b3556193bd591b5723fa2cf8ee81300b9248d85e1c3881bdaa30e1); /* line */ 
        coverage_0x5ed5e296(0x5b8e331b66e206cbb70a3abd57b8748c7807683d4263bea41d140eb734c61f79); /* statement */ 
bytes memory publicKey;

        // decode data from the bytes
coverage_0x5ed5e296(0x2b83f865bf83f1d171159c49e4201c947bace0cfb07a798224a5e2ace78a7a78); /* line */ 
        coverage_0x5ed5e296(0xf3e9d994008d2be3188fd5aa393f96f4d57f028d1d6d622e7a92c892795c30e9); /* statement */ 
(port, nonce, ip, publicIP) = fallbackDataConverter(data);
coverage_0x5ed5e296(0x9b2cad8da1b10f59b9885b9ac85add342db188a4d5752d23d608151a14093dec); /* line */ 
        coverage_0x5ed5e296(0x5a91c5e0221fc5c07884cc5d89633f696a586e13b50130a056bd5c498f8f5cf8); /* statement */ 
(publicKey, name) = fallbackDataConverterPublicKeyAndName(data);

        // checks that Node has correct data
coverage_0x5ed5e296(0xb5296400e22ace353b1e350536c59b86446502ca162e221f467d6cf68ef9bc98); /* line */ 
        coverage_0x5ed5e296(0x60805de0c4b5d3403834566bc19e6a70f1a3aead7c8befe38aeb589d535a1539); /* assertPre */ 
coverage_0x5ed5e296(0x8c3ffe911f8f7e828d840fc09c617c736ba96a4e22a052598f815546c6930d93); /* statement */ 
require(ip != 0x0 && !INodesData(nodesDataAddress).nodesIPCheck(ip), "IP address is zero or is not available");coverage_0x5ed5e296(0x655f65031acf5c1dab741de3d08a0e5a4a7964945e65076f7b15b198429e8f45); /* assertPost */ 

coverage_0x5ed5e296(0xe4b0e4c54b4b893f9884084fddd07cc65939c7996110f7ec6f029573d5bb1e7f); /* line */ 
        coverage_0x5ed5e296(0x210074e3ed09bbfb3f084fe7273d89ea21ee39555d8e253d1ccd999610b8c222); /* assertPre */ 
coverage_0x5ed5e296(0xc4e43852c1e458c11e1b5068888599d3545837c6c632e7eb7f769a4dc9cd1d0d); /* statement */ 
require(!INodesData(nodesDataAddress).nodesNameCheck(keccak256(abi.encodePacked(name))), "Name has already registered");coverage_0x5ed5e296(0xab8f16c0562d6809391b8bc2f556027a80ad9d4c4908a1f53b170cf0a2738aed); /* assertPost */ 

coverage_0x5ed5e296(0x9160b96e2c26445ad45dd2377b9bde60b5fd77c2bc9cbc33acb8225e4543e19d); /* line */ 
        coverage_0x5ed5e296(0xf78ebe5562f647b66fc4b0ed08926d7d08045d01c93e9891777312fd6e7b1d0a); /* assertPre */ 
coverage_0x5ed5e296(0x63bed56e7f486aeefc126d74b86f8386873568a8b7f364b66ee88b52ccb6f931); /* statement */ 
require(port > 0, "Port is zero");coverage_0x5ed5e296(0xdc01ab6d94a7bdfcf9a17c3817587bc9431e3baf90b299e898e69dac8d0291b6); /* assertPost */ 


        // adds Node to NodesData contract
coverage_0x5ed5e296(0xc8ea474dba114ea0085c667ed3713d213934f6c8a00e6ee3737f3db73fc6218f); /* line */ 
        coverage_0x5ed5e296(0xf3d5035c20817c56f033ac689718c743e4d522ebcdb9671df03ec1aba134f418); /* statement */ 
nodeIndex = INodesData(nodesDataAddress).addNode(
            from,
            name,
            ip,
            publicIP,
            port,
            publicKey);
        // adds Node to Fractional Nodes or to Full Nodes
        // setNodeType(nodesDataAddress, constantsAddress, nodeIndex);

coverage_0x5ed5e296(0x1b709eecb0ba8623f8ac0ff234400ee68d428946ff1e83bae62a28493475ef93); /* line */ 
        coverage_0x5ed5e296(0xe9e5fd469c42b041a0f5850788366ba574c3926431cb1b1f92aa7dd8983fc4a3); /* statement */ 
emit NodeCreated(
            nodeIndex,
            from,
            name,
            ip,
            publicIP,
            port,
            nonce,
            uint32(block.timestamp),
            gasleft());
    }

    /**
     * @dev removeNode - delete Node
     * function could be only run by SkaleManager
     * @param from - owner of Node
     * @param nodeIndex - index of Node
     */
    function removeNode(address from, uint nodeIndex) external allow("SkaleManager") {coverage_0x5ed5e296(0xd4ae075af5fcc9595881cec129a7e5422048b012ba00179214b760f15e4b3691); /* function */ 

coverage_0x5ed5e296(0x6871fedab693dfea54b25c59293981dc6e9f1dcc79464faf94b97a2224cfc6ee); /* line */ 
        coverage_0x5ed5e296(0x514213128f103c616eef6fe0bcae8d39695b838f207b88b38ddd860de4e752c4); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));

coverage_0x5ed5e296(0x6db96bf2bc39934d76669b07ac20e49f61768a6212dfb3ea239ce53b424d788d); /* line */ 
        coverage_0x5ed5e296(0xcffd48ef95facaa7a1a5901cb8d49bb9f4ea3bdfeabad7bac9527d5a01f791e6); /* assertPre */ 
coverage_0x5ed5e296(0x219e331814e378a2a00b8737626c556ad8cf3dcc55eafc853624fe12257efc3a); /* statement */ 
require(INodesData(nodesDataAddress).isNodeExist(from, nodeIndex), "Node does not exist for message sender");coverage_0x5ed5e296(0x44aa8cf8a823418ad28a881e2394a79e0c17c96f58702350e2db33722d7fcb6f); /* assertPost */ 

coverage_0x5ed5e296(0x56d0e0a7afeb61003791a625bcbf0050c264b47e8ecdcc6d5f2155ecd9c7d3a5); /* line */ 
        coverage_0x5ed5e296(0xbe1d2301a99a43bb764f7c53b5bf0b58468b34bb4f9e5150cc9a93c015641448); /* assertPre */ 
coverage_0x5ed5e296(0xdb306be60db3f256e2c8f3040fd5b34cca4f9e90cb1b2013cc5c874e08e321dd); /* statement */ 
require(INodesData(nodesDataAddress).isNodeActive(nodeIndex), "Node is not Active");coverage_0x5ed5e296(0x3e162bfaace2a0d17b26e71e46487b3c9cec03c9c26ab53ee894e2f50f14375b); /* assertPost */ 


coverage_0x5ed5e296(0x92ff9ecfa38aa4618371214d017170816cf87ba8e6f918bff2d4b3d070dd35d9); /* line */ 
        coverage_0x5ed5e296(0x1fbaa55593d0c0fdecc3f8c5058e76663a120e5d5620a6b12daf469c45f3b7b3); /* statement */ 
INodesData(nodesDataAddress).setNodeLeft(nodeIndex);

coverage_0x5ed5e296(0xfddc7300ba1aa3f3a77d50818ccc4262967668d358c49a131f720d3b04c8a694); /* line */ 
        coverage_0x5ed5e296(0xc810cb4f6c1687366bd5755647b8ea94bc0ab591548b43af9a90e6d74cad4aa3); /* statement */ 
INodesData(nodesDataAddress).removeNode(nodeIndex);
    }

    function removeNodeByRoot(uint nodeIndex) external allow("SkaleManager") {coverage_0x5ed5e296(0xc4207327ce4f3ed16eead426b5e160cdbc2dd45d73382e4b10fb54aba83d04ea); /* function */ 

coverage_0x5ed5e296(0x6a32660c9373372e6ce95b982c58be76231f625e80ddf11f123574f18566c2ab); /* line */ 
        coverage_0x5ed5e296(0x5a8b7330108201a7c42820a67cc570ccfb598e5e83b2007a0a1c6a5a638958c9); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0x5ed5e296(0x556e56b846453b2787238946f4025cd61bff498f41ea28a88fe0922e3ea8631a); /* line */ 
        coverage_0x5ed5e296(0x407de46585cbcc777970b064192f3e77e197c342c5f3c06c1063e21a8adf6777); /* statement */ 
INodesData(nodesDataAddress).setNodeLeft(nodeIndex);

coverage_0x5ed5e296(0xb6eae102590f46c4ed367cfef1b06146324341b4d2737a7011b2c3c39e594899); /* line */ 
        coverage_0x5ed5e296(0x5e98c1efab784305239368ec023d7c903852e201534aaf5b65482c53b8e65671); /* statement */ 
INodesData(nodesDataAddress).removeNode(nodeIndex);
    }

    /**
     * @dev initExit - initiate a procedure of quitting the system
     * function could be only run by SkaleManager
     * @param from - owner of Node
     * @param nodeIndex - index of Node
     * @return true - if everything OK
     */
    function initExit(address from, uint nodeIndex) external allow("SkaleManager") returns (bool) {coverage_0x5ed5e296(0xb4457a0c159cb6560402f961e52bb603a1357b50df1b89dbe183ee8df0581341); /* function */ 

coverage_0x5ed5e296(0x667f5ed2fe04bbadab43033e6224cc9533054c019c71c840b246aba934a50710); /* line */ 
        coverage_0x5ed5e296(0x89a0bd684badf9137b11d8b6080dbb53e36d7ab1b0666598698b8f9dbd3c5fc6); /* statement */ 
NodesData nodesData = NodesData(contractManager.getContract("NodesData"));

        // require(validatorService.validatorAddressExists(from), "Validator with such address doesn't exist");
coverage_0x5ed5e296(0x1ce32859826782e2962204927e951805dcc11ed668569506b8297969338afb67); /* line */ 
        coverage_0x5ed5e296(0xbe3e7e8b77fde9e61a3e98ce13157e34cfe86fb7d9fe607732ad4ed786da8314); /* assertPre */ 
coverage_0x5ed5e296(0x9d444e060a269efa82276ae8f2e4ed69b7ccd3ad5c715909b141d56f41191b9e); /* statement */ 
require(nodesData.isNodeExist(from, nodeIndex), "Node does not exist for message sender");coverage_0x5ed5e296(0xcb94c118e89f4af9b7155af2694c245e1ccbd75af7aee9060b70ce959817f485); /* assertPost */ 


coverage_0x5ed5e296(0x6aea1377fa5a491090d48554f1d6e04b882f1434c9b6eeb04c79d1ce0f8311c6); /* line */ 
        coverage_0x5ed5e296(0x3e1f8a837517638fc7e658da082ded297d83b8360d1275fa895ab2af2aa230e4); /* statement */ 
nodesData.setNodeLeaving(nodeIndex);

coverage_0x5ed5e296(0xe23ed8dbb0143aea7a16cedd1b49b2d68b041e264f3acf45c8670ab55c7ebfc9); /* line */ 
        coverage_0x5ed5e296(0x6fa1b6b576a5f3fd6887fe6d3186e6da69a591e596b1d5b1a74fd839ed293407); /* statement */ 
emit ExitInited(
            nodeIndex,
            from,
            uint32(block.timestamp),
            uint32(block.timestamp),
            gasleft());
coverage_0x5ed5e296(0xb3b0a30e1f2fa65766500b26e2216bb550333b99fe6538bd71b1fed261544105); /* line */ 
        coverage_0x5ed5e296(0xc7ff29489cb0131305e34bff6688760eb1b3254b6fc7fcd3d512b9d4a1337329); /* statement */ 
return true;
    }

    /**
     * @dev completeExit - finish a procedure of quitting the system
     * function could be run only by SkaleMManager
     * @param from - owner of Node
     * @param nodeIndex - index of Node
     * @return amount of SKL which be returned
     */
    function completeExit(address from, uint nodeIndex) external allow("SkaleManager") returns (bool) {coverage_0x5ed5e296(0x9960b1478efcee5f9117c21c5a96d19c7f956147d1ba21295ea1684e3ad8bfb0); /* function */ 

coverage_0x5ed5e296(0xb60a4510764ce78636b183f90130050cd28e6f26740b4f8b7f99a37c19d901a4); /* line */ 
        coverage_0x5ed5e296(0x1a33b2343b8b5e45cfc59a6d22f4c1872a523391bb8669d9b8ec27de2b891e43); /* statement */ 
NodesData nodesData = NodesData(contractManager.getContract("NodesData"));

        // require(validatorService.validatorAddressExists(from), "Validator with such address doesn't exist");
coverage_0x5ed5e296(0xb7c5d63f66f9ef8dd51e55c155739c4e6b40cb4b6e625a9dd2536de074929fd3); /* line */ 
        coverage_0x5ed5e296(0xfebb7651f9655de79969e50757c8c3e2a7ca38e16a91ae252720219eb375919a); /* assertPre */ 
coverage_0x5ed5e296(0x6ee387c1bb94e78cec7f2d004d5488ae654424decb20792f657f69c5a29b1162); /* statement */ 
require(nodesData.isNodeExist(from, nodeIndex), "Node does not exist for message sender");coverage_0x5ed5e296(0xfc2319f866753913a4c95a2d60d436587f35c7a5763a6a93bec4b0958a020803); /* assertPost */ 

coverage_0x5ed5e296(0x46748d25689fdcba4f4a9c4ea71137eec6e08ea887989c47f964b4f10a95d627); /* line */ 
        coverage_0x5ed5e296(0x458548b5de06f89035b5ad18b8bf45858b55ce2043e262345f164ced0e80c0a0); /* assertPre */ 
coverage_0x5ed5e296(0x81a64dc0ee3dc4dcd934134a3b48af37194e75b13ac5a7b1235d7361d2b22464); /* statement */ 
require(nodesData.isNodeLeaving(nodeIndex), "Node is not Leaving");coverage_0x5ed5e296(0x101a3564f595981ffefbb5ea6df5874cb4092c64a2e5098357c23138b095a735); /* assertPost */ 


coverage_0x5ed5e296(0x2e5d35877ace687a92b8947291db3d87fb67b11e1b80c9cf1d4921b4e657be17); /* line */ 
        coverage_0x5ed5e296(0x6e7378f7140b83090c318fd2ac948f87a6dfb6e45cc83119bdfbbe217fafd4af); /* statement */ 
nodesData.setNodeLeft(nodeIndex);

coverage_0x5ed5e296(0x13e2f9a69d7a234873ecc52357e187458580ec141a16676cecbf6b8c7c8c1e32); /* line */ 
        coverage_0x5ed5e296(0xc28cb1686f5d1305f9466a0f48df6007de2031d6419a4d04b52f47f440b1ecde); /* statement */ 
nodesData.removeNode(nodeIndex);

coverage_0x5ed5e296(0xd27798696bfe394e0a771ddff60293b448b7f70eb02b02603a564669fc9d1e2c); /* line */ 
        coverage_0x5ed5e296(0x0a227b31db5144f6d3860cbbd54a44700cbda423397e03b1e5cbd61349aa9f1a); /* statement */ 
emit ExitCompleted(
            nodeIndex,
            from,
            uint32(block.timestamp),
            gasleft());
coverage_0x5ed5e296(0x1b68cef4b88df92c2375daf10d0cfeaaa7113b03fb295ed70b1422f125512bd5); /* line */ 
        coverage_0x5ed5e296(0xae05e8718aaf4bd085d2a1f9cfb5ef4a1228afebbbdeb42620dfe21a4032d606); /* statement */ 
return true;
    }

    // /**
    //  * @dev setNodeType - sets Node to Fractional Nodes or to Full Nodes
    //  * @param nodesDataAddress - address of NodesData contract
    //  * @param constantsAddress - address of Constants contract
    //  * @param nodeIndex - index of Node
    //  */
    // function setNodeType(address nodesDataAddress, address constantsAddress, uint nodeIndex) internal {
    //     bool isNodeFull = (
    //         INodesData(nodesDataAddress).getNumberOfFractionalNodes() *
    //         IConstants(constantsAddress).FRACTIONAL_FACTOR() >
    //         INodesData(nodesDataAddress).getNumberOfFullNodes() *
    //         IConstants(constantsAddress).FULL_FACTOR()
    //     );

    //     if (INodesData(nodesDataAddress).getNumberOfFullNodes() == 0 || isNodeFull) {
    //         INodesData(nodesDataAddress).addFullNode(nodeIndex);
    //     } else {
    //         INodesData(nodesDataAddress).addFractionalNode(nodeIndex);
    //     }
    // }

    /**
     * @dev setSystemStatus - sets current system status overload, normal or underload
     * @param constantsAddress - address of Constants contract
     */
    /*function setSystemStatus(address constantsAddress) internal {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint numberOfNodes = 128 * (INodesData(dataAddress).numberOfActiveNodes() + INodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = ISchainsData(schainsDataAddress).sumOfSchainsResources();
        if (4 * numberOfSchains / 3 < numberOfNodes && !(4 * numberOfSchains / 3 < (numberOfNodes - 1))) {
            IConstants(constantsAddress).setLastTimeUnderloaded();
        }
    }*/

    /**
     * @dev coefficientForPrice - calculates current coefficient for Price
     * coefficient calculates based on system status duration
     * @param constantsAddress - address of Constants contract
     * @return up - dividend
     * @return down - divider
     */
    /*function coefficientForPrice(address constantsAddress) internal view returns (uint up, uint down) {
        address dataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("NodesData")));
        address schainsDataAddress = ContractManager(contractsAddress).contracts(keccak256(abi.encodePacked("SchainsData")));
        uint numberOfDays;
        uint numberOfNodes = 128 * (INodesData(dataAddress).numberOfActiveNodes() + INodesData(dataAddress).numberOfLeavingNodes());
        uint numberOfSchains = ISchainsData(schainsDataAddress).sumOfSchainsResources();
        if (20 * numberOfSchains / 17 > numberOfNodes) {
            numberOfDays = (now - IConstants(constantsAddress).lastTimeOverloaded()) / IConstants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(99, numberOfDays, 100);
            down = 100;
        } else if (4 * numberOfSchains / 3 < numberOfNodes) {
            numberOfDays = (now - IConstants(constantsAddress).lastTimeUnderloaded()) / IConstants(constantsAddress).SECONDS_TO_DAY();
            up = binstep(101, numberOfDays, 100);
            down = 100;
        } else {
            up = 1;
            down = 1;
        }
    }*/

    /**
     * @dev binstep - exponentiation by squaring by modulo (a^step)
     * @param a - number which should be exponentiated
     * @param step - exponent
     * @param div - divider of a
     * @return x - result (a^step)
     */
    /*function binstep(uint a, uint step, uint div) internal pure returns (uint x) {
        x = div;
        while (step > 0) {
            if (step % 2 == 1) {
                x = mult(x, a, div);
            }
            a = mult(a, a, div);
            step /= 2;
        }
    }*/

    /*function mult(uint a, uint b, uint div) internal pure returns (uint) {
        return (a * b) / div;
    }*/

    /**
     * @dev fallbackDataConverter - converts data from bytes to normal parameters
     * @param data - concatenated parameters
     * @return port
     * @return nonce
     * @return ip address
     * @return public ip address
     */
    function fallbackDataConverter(bytes memory data)
        private
        pure
        returns (uint16, uint16, bytes4, bytes4 /*address secondAddress,*/)
    {coverage_0x5ed5e296(0xfe5bae39987bd513127f24d3c8fe1e96b6e723131ecba44c7f6b752259a2dbd9); /* function */ 

coverage_0x5ed5e296(0xc6582b9397cc58665c607321886b83be2f91c4ead4e2f79827984dd6600ff432); /* line */ 
        coverage_0x5ed5e296(0x4edc718c8fc5356b7541e673dab0c8d9597bddcba5d20483262ee3cd7baea433); /* assertPre */ 
coverage_0x5ed5e296(0xfc37a80d3bfec2778f1ecdc7470d449372b31659d61f3826573b1d3f95ad2651); /* statement */ 
require(data.length > 77, "Incorrect bytes data config");coverage_0x5ed5e296(0x457b2e96d2b7fac9fc65dcc04e2f5f6ea6b47d421ee0697324de51c1e2fc745f); /* assertPost */ 


coverage_0x5ed5e296(0xe4efbcb518e9f87bb664d8d2cdc8b2e782d6c4792f681860f5e543f7682647df); /* line */ 
        coverage_0x5ed5e296(0x25a072cd8d40a9dc89ed5021882a10782b650c49ac3756d2c6745c10a756449b); /* statement */ 
bytes4 ip;
coverage_0x5ed5e296(0x430ee764a45e5631648d52069675dc6205e3510495796408448728f381f0d03a); /* line */ 
        coverage_0x5ed5e296(0x5b0d12eb3f8e6dd76a60c2f14c12b42483e0b7d988319effe03de7c701d86a91); /* statement */ 
bytes4 publicIP;
coverage_0x5ed5e296(0xb70b24fbc152903c97de6003a5e7ff1d5862a833f93a002d8e38a5706d13864c); /* line */ 
        coverage_0x5ed5e296(0xdf0bc115776cfc4f722b494b27c8a9947a180698fded7a569aaa4ca08f0acf41); /* statement */ 
bytes2 portInBytes;
coverage_0x5ed5e296(0x96b052e8a36a9ed877a08dda15a8b7230ab62d4901deeba37a4c645d95b15c21); /* line */ 
        coverage_0x5ed5e296(0x8f4538cacdfec1ac69c562865d8ef71f8b604afa52e0385919c54539583bfd3a); /* statement */ 
bytes2 nonceInBytes;
coverage_0x5ed5e296(0xa74d165b4059e9b77ce624be93328001d2f1527bd7a30afcd9256fa2254d22c8); /* line */ 
        assembly {
            portInBytes := mload(add(data, 33)) // 0x21
            nonceInBytes := mload(add(data, 35)) // 0x25
            ip := mload(add(data, 37)) // 0x29
            publicIP := mload(add(data, 41))
        }

coverage_0x5ed5e296(0xcdc351296fcc628bf511d09b3a56527642e3f347512a8b311145f62ebc718696); /* line */ 
        coverage_0x5ed5e296(0x18694ecd514e58ec87abde641fd632085590a95fa46bdc44c36505f070b86750); /* statement */ 
return (uint16(portInBytes), uint16(nonceInBytes), ip, publicIP);
    }

    /**
     * @dev fallbackDataConverterPublicKeyAndName - converts data from bytes to public key and name
     * @param data - concatenated public key and name
     * @return public key
     * @return name of Node
     */
    function fallbackDataConverterPublicKeyAndName(bytes memory data) private pure returns (bytes memory, string memory) {coverage_0x5ed5e296(0x11ba3fd189092c91b95b0b3be0466047ab1b6efa5c1799e04f978bec6bff6c64); /* function */ 

coverage_0x5ed5e296(0x9844fb8b14af0605f34715797eb1b641321d5100143af9cf58a74c25131ec1d6); /* line */ 
        coverage_0x5ed5e296(0xf178f2838cab04df373b61dfe422366142721e342d01b100ec7b0cdc7ffcb1af); /* assertPre */ 
coverage_0x5ed5e296(0xf218f0d1651bf72c40ad442c90959e13d21f1f3f0b5d92a7c6b7a646c93053a6); /* statement */ 
require(data.length > 77, "Incorrect bytes data config");coverage_0x5ed5e296(0xdf353aea05ca972ff5fc8fabdd52d0661f19f577a21802261557f754d69451ba); /* assertPost */ 

coverage_0x5ed5e296(0x5ec839758a93c5f79fd16112aa4a68c8177f28c5206727f293ed0dc967ced293); /* line */ 
        coverage_0x5ed5e296(0xb28863213da813b2b6224fb2a92471ef35cc37da010b2c0024630e84c87b25fe); /* statement */ 
bytes32 firstPartPublicKey;
coverage_0x5ed5e296(0x74a95533dd443eeff4f3fc11ad785b154d06f78705cba7d06adaf9bb8fd81000); /* line */ 
        coverage_0x5ed5e296(0x3b6c6ef1c43d94cbcbfbe85c544c5743d475ad5d85e76d48ab0d521930810996); /* statement */ 
bytes32 secondPartPublicKey;
coverage_0x5ed5e296(0x1ee0aeedbc72a5db1a09511fde12a0699dea6cdfd032108c14957ec28cedd2d2); /* line */ 
        coverage_0x5ed5e296(0xb76fa14b76a385097f2c386545b9194a30ae4cdb5338112e5044aabda14a593d); /* statement */ 
bytes memory publicKey = new bytes(64);

        // convert public key
coverage_0x5ed5e296(0x1d4089beeecde12fa24d85d74e7ee2c667c99cc26542b7b4af23ab74ec774659); /* line */ 
        assembly {
            firstPartPublicKey := mload(add(data, 45))
            secondPartPublicKey := mload(add(data, 77))
        }
coverage_0x5ed5e296(0x5a47ad29653fd3b1433033cbda70bda249e2d3e653e6150b08b40103a92db491); /* line */ 
        coverage_0x5ed5e296(0x6a58579248ce032285f992d3061f21c0389576757d8ad7e2050486f477b12900); /* statement */ 
for (uint8 i = 0; i < 32; i++) {
coverage_0x5ed5e296(0x633021525db0706750925dbf64549352ccddf89fae4be9b12884e17397bbce16); /* line */ 
            coverage_0x5ed5e296(0xbef489008220435dc2c0f8c2d17ecb11a1e15d74b58f72040c109dffd432c5ff); /* statement */ 
publicKey[i] = firstPartPublicKey[i];
        }
coverage_0x5ed5e296(0x44ca5d911d730fe2e469735fa5e5319cfaef3e7742f09e62b439e08a5a19c0ee); /* line */ 
        coverage_0x5ed5e296(0x6497ccb5d78ae21abcbd3f586f13c4e397b2c17a83fe8235b8f558e210175747); /* statement */ 
for (uint8 i = 0; i < 32; i++) {
coverage_0x5ed5e296(0x81f2a74f50c78afbf92a7bbcc55bc6a93c81219e1cf391ed5b53020d6e04903c); /* line */ 
            coverage_0x5ed5e296(0x27e88ea0fff465a6d0bd0f0e2077823964dff3a5a2efbd2ff2bc57c837802a36); /* statement */ 
publicKey[i + 32] = secondPartPublicKey[i];
        }

        // convert name
coverage_0x5ed5e296(0xd87bc4571373cf75eba6042d1ba3b2ca0982d143d88e99f1083fa13560271ac8); /* line */ 
        coverage_0x5ed5e296(0x6cc61d379e5dc62d83c54caa12bcfdde90eeb45f6eab99ac35837632302cf4d5); /* statement */ 
string memory name = new string(data.length - 77);
coverage_0x5ed5e296(0x97ecfd5c7ecfc65682be7491e7d94c3576f63819e12850da26a6c6035b87f7a7); /* line */ 
        coverage_0x5ed5e296(0x7d60c61c2a07d7ddf4ef4d13ebd7206836aacd8e0eeb1476cdde4b5a518e4f7f); /* statement */ 
for (uint i = 0; i < bytes(name).length; ++i) {
coverage_0x5ed5e296(0x1613eef60aed71fe7cdf54afde071068ba372c266bdb8dd947b99e407d7f668b); /* line */ 
            coverage_0x5ed5e296(0x6b64a5ca69639b11d3fa78977f96cd74a125eb8fe47b483388fb92001a85a76c); /* statement */ 
bytes(name)[i] = data[77 + i];
        }
coverage_0x5ed5e296(0x3d437b762817a31c3697546ebe8907f0b83668e84956ed9838a588479547202d); /* line */ 
        coverage_0x5ed5e296(0x696702ed42bb8bd958ca533dfca946cc2256fa66b468327cbb2c6c75367769aa); /* statement */ 
return (publicKey, name);
    }

}
