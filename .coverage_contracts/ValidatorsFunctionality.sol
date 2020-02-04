/*
    ValidatorsFunctionality.sol - SKALE Manager
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

import "./GroupsFunctionality.sol";
import "./interfaces/IConstants.sol";
import "./interfaces/INodesData.sol";
import "./interfaces/IValidatorsFunctionality.sol";

interface IValidatorsData {
    function addValidatedNode(bytes32 validatorIndex, bytes32 data) external;
    function addVerdict(bytes32 validatorIndex, uint32 downtime, uint32 latency) external;
    function removeValidatedNode(bytes32 validatorIndex, uint indexOfValidatedNode) external;
    function removeAllValidatedNodes(bytes32 validatorIndex) external;
    function removeAllVerdicts(bytes32 validatorIndex) external;
    function getValidatedArray(bytes32 validatorIndex) external view returns (bytes32[] memory);
    function getLengthOfMetrics(bytes32 validatorIndex) external view returns (uint);
    function verdicts(bytes32 validatorIndex, uint numberOfVerdict, uint layer) external view returns (uint32);
}


contract ValidatorsFunctionality is GroupsFunctionality, IValidatorsFunctionality {
function coverage_0xdb799386(bytes32 c__0xdb799386) public pure {}


    event ValidatorCreated(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfValidators,
        uint32 time,
        uint gasSpend
    );

    event ValidatorUpgraded(
        uint nodeIndex,
        bytes32 groupIndex,
        uint numberOfValidators,
        uint32 time,
        uint gasSpend
    );

    event ValidatorsArray(
        uint nodeIndex,
        bytes32 groupIndex,
        uint[] nodesInGroup,
        uint32 time,
        uint gasSpend
    );

    event VerdictWasSent(
        uint indexed fromValidatorIndex,
        uint indexed toNodeIndex,
        uint32 downtime,
        uint32 latency,
        bool status,
        uint32 time,
        uint gasSpend
    );

    event MetricsWereCalculated(
        uint forNodeIndex,
        uint32 averageDowntime,
        uint32 averageLatency,
        uint32 time,
        uint gasSpend
    );

    event PeriodsWereSet(
        uint rewardPeriod,
        uint deltaPeriod,
        uint32 time,
        uint gasSpend
    );


    event ValidatorRotated(
        bytes32 groupIndex,
        uint newNode
    );

    constructor(
        string memory newExecutorName,
        string memory newDataName,
        address newContractsAddress
    )
        GroupsFunctionality(
            newExecutorName,
            newDataName,
            newContractsAddress
        )
    public
    {coverage_0xdb799386(0x2c7f0d2d1848e85f5a6e2295efcb12deec04a775ff4c54bdc4fa18c486ed77e8); /* function */ 


    }

    /**
     * addValidator - setup validators of node
     */
    function addValidator(uint nodeIndex) external allow(executorName) {coverage_0xdb799386(0x29457460f30ba167511d4a762f9897ce89a81a88036ade3fa13ecfea59792831); /* function */ 

coverage_0xdb799386(0x64b1450f477a87b078901356eb71d3eb7882a7cb4680e6fd5894d21d500563e7); /* line */ 
        coverage_0xdb799386(0x2ddbba330e5b56c29b1f95f5bb51c62d8ca7718f5f2864febfcca86ce1879f59); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xdb799386(0x7113e3532e9ca6ee4f74dd5c9a1663acfb89f4c75a17996820ccb16be3f75ef4); /* line */ 
        coverage_0xdb799386(0x03ec2a1c2a8b63abc1662d3fb0b15b7fe83ae6846d2ec861985e6a69bf94b19a); /* statement */ 
IConstants constantsHolder = IConstants(constantsAddress);
coverage_0xdb799386(0x942e7036824f9387b15e35e8bf422473e244d7103ca511c0c08c1ce365583c26); /* line */ 
        coverage_0xdb799386(0xf87886c5488247fe798a11956f72acdcb58d8b9393d5be18da3db5a20f184a80); /* statement */ 
bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
coverage_0xdb799386(0x68bd267e3c895feff5191b4b91460ed9b1fb000a0b8147ab7323f11afd6a580e); /* line */ 
        coverage_0xdb799386(0xf9b4cebd3e6ab5c56b8bdb2aad37cb8e59fc9890e4f5428e9bd21497c7f25ed2); /* statement */ 
uint possibleNumberOfNodes = constantsHolder.NUMBER_OF_VALIDATORS();
coverage_0xdb799386(0x64023ec3a662db0007a5aa0cd8f28aec8b373aff71ae73251449a624e2658566); /* line */ 
        coverage_0xdb799386(0x4fcb5f52f66e136d4dd05a2da9677e1eabeccd391dec8491ebef7b446a21a6d6); /* statement */ 
addGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
coverage_0xdb799386(0xc60f3ee9615d027b98679708862caf7e1746869542997a7009a0966ea40011eb); /* line */ 
        coverage_0xdb799386(0x45774e5ada910135e8a2abd660b0353ad4f8030d68ca5db5cc7f91e43f4df79d); /* statement */ 
uint numberOfNodesInGroup = setValidators(groupIndex, nodeIndex);
coverage_0xdb799386(0xca66d036244c990ac864cdfc2b49688ce26f6ce1e7df8c8913fddc7a43351b2b); /* line */ 
        coverage_0xdb799386(0xa80b6ea832ca6c0ac227e9cba468a726d8277b1a5052b97858fbd4e036166249); /* statement */ 
emit ValidatorCreated(
            nodeIndex,
            groupIndex,
            numberOfNodesInGroup,
            uint32(block.timestamp), gasleft()
        );
    }

    function upgradeValidator(uint nodeIndex) external allow(executorName) {coverage_0xdb799386(0x514d091b5b1cdb12af056d754370fb1b2b82897b1687b3b9561b6786cde84df1); /* function */ 

coverage_0xdb799386(0xf8eeb776bcbb3a8f69577c5c17bbf11c166a1a1e707c0fe2b700e2c1c332d0cf); /* line */ 
        coverage_0xdb799386(0x2e235fa9b64c26087210a10e24cead3077a492139346ddb49f4d637717ef926d); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xdb799386(0xc699ca0d50817b03cdc58a846940f33c6c6eee6f32695f5bf33627e2d0dca63a); /* line */ 
        coverage_0xdb799386(0x62d5e30149e1aaa0512d74c14ae636f5f3191c1e90fa81d2f74f076d296c0772); /* statement */ 
IConstants constantsHolder = IConstants(constantsAddress);
coverage_0xdb799386(0xa2b27db75ba4ee6041ca3b0f8751e0bdbc65ed13bcb6554eefe1dbd540368d1c); /* line */ 
        coverage_0xdb799386(0xb9a734023aad08224290f77824dc02b198c70e8781ed52f75755e93b8a490c0d); /* statement */ 
bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
coverage_0xdb799386(0x3dd4bd0844b0da2cc39acaf8134574db306bd70d85c000f26d48e0a4f5606f3d); /* line */ 
        coverage_0xdb799386(0x8251faab698bbd9377c9b26af2732fabb4610316575bcb3a6b4341c3d7d1eb48); /* statement */ 
uint possibleNumberOfNodes = constantsHolder.NUMBER_OF_VALIDATORS();
coverage_0xdb799386(0x7cce443af9b2ea3ae6c13863fb25d9874be212217d76a77a2788aaf3581c6eeb); /* line */ 
        coverage_0xdb799386(0x0fdd5a4631dc43c4e2d84d03b4dfe7b766a0f107b5b3623f266aa91a2bb7de99); /* statement */ 
upgradeGroup(groupIndex, possibleNumberOfNodes, bytes32(nodeIndex));
coverage_0xdb799386(0x6874dc86ab72b3a881c18f6f2cd475438f3df181a9fbaed1d11af27d802ce977); /* line */ 
        coverage_0xdb799386(0x2a4bd8dd759135778a3370e92014ae27add9882d8721726b8e79f3c4f83676b9); /* statement */ 
uint numberOfNodesInGroup = setValidators(groupIndex, nodeIndex);
coverage_0xdb799386(0xd4a7a55f5a1cc768717e220928b377920df47e27536425753fa9f6851a2db159); /* line */ 
        coverage_0xdb799386(0x6238e0ad1ce92298d5f282fa29badcc5b5440ed6981156522f63d34ece40fe32); /* statement */ 
emit ValidatorUpgraded(
            nodeIndex,
            groupIndex,
            numberOfNodesInGroup,
            uint32(block.timestamp), gasleft()
        );
    }

    function deleteValidatorByRoot(uint nodeIndex) external allow(executorName) {coverage_0xdb799386(0xbaee61d14df7c39a2706053e162168d5aa2eb288c3d6f19fe0bd540f8b3a111d); /* function */ 

coverage_0xdb799386(0xc829f66b8162968674e6a9006ab5043c6ec64c3bdf83683e91e470ca8db9329d); /* line */ 
        coverage_0xdb799386(0xa97a2887dacc0d68dc0f9957f1bce177b56dcb2781aafff99097b634a69acd39); /* statement */ 
bytes32 groupIndex = keccak256(abi.encodePacked(nodeIndex));
coverage_0xdb799386(0x7272c1c44e2ff7fcc0c0d7d4e549569c7f418c8245cd55029afcdc594828321e); /* line */ 
        coverage_0xdb799386(0x93045730a3adad216f2bb09278bfc480db3808990271403b9a2964ca11aaaf11); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0x00134afba40a5f5d3b23b23b9c9a9d7089da4c1e3280b3c2b59fb70a4363e826); /* line */ 
        coverage_0xdb799386(0x68ad32d9861cfe435ad50aafb1ac1272e37aa56a5dd6bae982e4ff1c9a53a2a9); /* statement */ 
IValidatorsData(dataAddress).removeAllVerdicts(groupIndex);
coverage_0xdb799386(0xdd73bf6d7b339f1473ae33d1a1993861e8db66c489a50841029c04cc332960c5); /* line */ 
        coverage_0xdb799386(0x21b463f40ea098e9db0c380d926feded19fdd535408b1f86f1a1b12597b3abcd); /* statement */ 
IValidatorsData(dataAddress).removeAllValidatedNodes(groupIndex);
coverage_0xdb799386(0xae3fc6c84c946d009ec507c79b0e436a041bce5dcc3131a3691204999eb25ba4); /* line */ 
        coverage_0xdb799386(0xb8aec668a6f18f291fe4c159499209b769417c6c2e43e9fd2447f3f4fa688f7c); /* statement */ 
deleteGroup(groupIndex);
    }

    function sendVerdict(
        uint fromValidatorIndex,
        uint toNodeIndex,
        uint32 downtime,
        uint32 latency) external allow(executorName)
    {coverage_0xdb799386(0xc1942441ae2bf717ab79c7efea92b4a2ce50c0e5ea347a6f021663ba47512c8b); /* function */ 

coverage_0xdb799386(0xb8f586ca8f38c5c654722204123c22170b4dab63bfbb96158f4b6daba7fa19c3); /* line */ 
        coverage_0xdb799386(0xa889edb1625430680911479e2508ce9b90945ea80a46670635add85771f01f65); /* statement */ 
uint index;
coverage_0xdb799386(0x978b3634bec64ce70f4b414bea0c0d869525ebb14c76f70f6ce1c858c330bd24); /* line */ 
        coverage_0xdb799386(0xf6f17763aaa39f8d732cc393e00f19631599fa87b99bc84f2bfc99ea36ceb4ed); /* statement */ 
uint32 time;
coverage_0xdb799386(0x4d23aefbf067dd5ca5faa2fa1afc6f8ba9c0fdc3791c17ccacb215c2c5eee838); /* line */ 
        coverage_0xdb799386(0x3f88c403b88cb3c619a73d2d490566d6e254bb65d92db091175b038b295dd63a); /* statement */ 
bytes32 validatorIndex = keccak256(abi.encodePacked(fromValidatorIndex));
coverage_0xdb799386(0x443218065255aaf38cab6d4c988ec54c882abe57956bcf16e65648e5fcc7bb8e); /* line */ 
        coverage_0xdb799386(0xa837e8f1412450fb0c427ce7c2f4a86b6dc81a10d6cdb32bb7288f3fe56a5490); /* statement */ 
(index, time) = find(validatorIndex, toNodeIndex);
coverage_0xdb799386(0xfe00f57d175b7902e99e889d7ae8f7de61c22b14da4f010ee99e52c5d40fc93a); /* line */ 
        coverage_0xdb799386(0x2384717707af76d399c19b3c2c1c6a71191c930a3bdb2983a83658a6972829d3); /* assertPre */ 
coverage_0xdb799386(0x4f94ab19e32abf3957f1937b128474a66ef484975f74ad2d519875870f0c9320); /* statement */ 
require(time > 0, "Validated Node does not exist in ValidatorsArray");coverage_0xdb799386(0x38ea9a504e861496e4cd2ac76d21931ac058cdc2c4d0013b32b6d392801a7382); /* assertPost */ 

coverage_0xdb799386(0xa9a55f54344b6759d4bf74aabfe8fb1122fe90b03b9892b4621e9a1e0ca8eeec); /* line */ 
        coverage_0xdb799386(0xeac3004217d702c77069b01e983563c12492c001a9111a733c4dcb18f16c24c5); /* assertPre */ 
coverage_0xdb799386(0x87dd1f1056cdb8e8b3e633e151b6909ecdc0d4514a83521145375e8d06088ae0); /* statement */ 
require(time <= block.timestamp, "The time has not come to send verdict");coverage_0xdb799386(0x8d2de3af9b5dbeaaaa76b383e05ec52f8ee2a3c35ad7c9e32dc120488caa63d6); /* assertPost */ 

coverage_0xdb799386(0xa1c9570d8add1bb590228de2f541961be0e2d4c4da1819136224238a8b9afe8c); /* line */ 
        coverage_0xdb799386(0xf2b632f90da589ee14cc5682ca9a7ce202a11266fca57e2ffb51f24bc9927c95); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0xccac6a41b46d73322970947e2508ad3569b910781c97364db6d7a0c1e260f324); /* line */ 
        coverage_0xdb799386(0x949500a6e5c1e50e4725a1739e4a4da2e049a11d6740693e08d6426184a7bd9b); /* statement */ 
IValidatorsData(dataAddress).removeValidatedNode(validatorIndex, index);
coverage_0xdb799386(0xd9ededc12da29dc0de227abb483aa433a1597c01c1c346ab005f09a62b9a93b9); /* line */ 
        coverage_0xdb799386(0xee6e59146fc97980c5f8a3a8c5d126c0d98ab57a6068ebc31c972679504a7cce); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xdb799386(0x9abd76538e8588e0347e34785f78c2cdbe4a34cc52fe45c5beff7c04b061bae1); /* line */ 
        coverage_0xdb799386(0x596a2c6e3d47c1ffcbb52c7f0572e0b1a13845dba4d33cf8d9f57a220701bd84); /* statement */ 
bool receiveVerdict = time + IConstants(constantsAddress).deltaPeriod() > uint32(block.timestamp);
coverage_0xdb799386(0x8ba3aea5e69897188400aafd8f3c6d9fa15cdf79345c3b9b9fcc2a6bd89a5645); /* line */ 
        coverage_0xdb799386(0x8f9f0a96026b82902a9599b3eb9c7d4612203e51e6446b5e8229dc2b9a7c0f4b); /* statement */ 
if (receiveVerdict) {coverage_0xdb799386(0x3faf9b7d674f52f39c764124bdd9fe288988a4bbdf2a07f722742fa01eb2a574); /* branch */ 

coverage_0xdb799386(0x1cc275e1d1a1280e83dae4e91f997b740eba63fc1deb772129e9eef554c31705); /* line */ 
            coverage_0xdb799386(0x4228072299daffef591860f45633ab49f9e2ee17df520b7dfff84f0bc2408b11); /* statement */ 
IValidatorsData(dataAddress).addVerdict(keccak256(abi.encodePacked(toNodeIndex)), downtime, latency);
        }else { coverage_0xdb799386(0x87bf889533f32cabd3ebbf568256e8bccc183f08f5076493b66cbb0e8f163365); /* branch */ 
}
coverage_0xdb799386(0x962185f57e1c81841ebe01a033952059e434ea84d73050af66e1833586ce974a); /* line */ 
        coverage_0xdb799386(0xa6f77d95f2798f3c6279de958cc1d758a6e8bb3890b76c42f0fe5a90a2a00d33); /* statement */ 
emit VerdictWasSent(
            fromValidatorIndex,
            toNodeIndex,
            downtime,
            latency,
            receiveVerdict, uint32(block.timestamp), gasleft());
    }

    function calculateMetrics(uint nodeIndex) external allow(executorName) returns (uint32 averageDowntime, uint32 averageLatency) {coverage_0xdb799386(0x997e8dfab83241bb5a7b288e5e41d4dcd4003af354400d44e268b387f99ab4b7); /* function */ 

coverage_0xdb799386(0xb935cfe7657ff1409b2fe0e9e8d7b0dc368fc2dab6e9f170a39090de0175b505); /* line */ 
        coverage_0xdb799386(0xb2295c59b927a7c7fd1d27c1e25ee2cd5a165d94a753ae7e3366684a0eb0d4ec); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0xee8687dc046fc3a4f3f7483dc2c59bf1176f2e985b615bb4202bb945f7c53f16); /* line */ 
        coverage_0xdb799386(0x8a505fc7e34029b42d3daf8ef2d38586d39d63877f27de6e4cd954ff3221649c); /* statement */ 
bytes32 validatorIndex = keccak256(abi.encodePacked(nodeIndex));
coverage_0xdb799386(0x014e1ac708b3e6f6e57f801a267359d3e72b356a9e7e97874dafdc086f3e04ed); /* line */ 
        coverage_0xdb799386(0xed4c32ce07be9f5f7952fc53f8abbb2f9873981850ca717a1d89ca7a82c9f350); /* statement */ 
uint lengthOfArray = IValidatorsData(dataAddress).getLengthOfMetrics(validatorIndex);
coverage_0xdb799386(0x96af5f0fc6da66f82ff0cfad2d8096764fc8c871f3536208c6538e6e06df3b4a); /* line */ 
        coverage_0xdb799386(0xa69bb706f8701d4deb4646b686491e5ac7a66a07f73f8879a2c2d6d1a69b13b3); /* statement */ 
uint32[] memory downtimeArray = new uint32[](lengthOfArray);
coverage_0xdb799386(0xeed544cbddf849d58ad3377844e6ad4c4b60a49a6bf3d3e8f8c73327d112e3ee); /* line */ 
        coverage_0xdb799386(0x0ee111dd3e05e367238b715d53aa5d801b93c125e3385668e018eccf36839b8f); /* statement */ 
uint32[] memory latencyArray = new uint32[](lengthOfArray);
coverage_0xdb799386(0xd6ee76a2986d97f328c052f6d5e0a52060d13b388d9804c9e5af8efc603c0b09); /* line */ 
        coverage_0xdb799386(0xdd504343614cbfbc09dbcca105a5c7150c32df5888a04b3f65623178e8a10411); /* statement */ 
for (uint i = 0; i < lengthOfArray; i++) {
coverage_0xdb799386(0xcf0764164421e1f59e7711028c64416383c6e36bad989607cc644c393d305f4b); /* line */ 
            coverage_0xdb799386(0x902e1004977b79b60e70f640e8d1fb572a3ca1afc9adc526c4428d88bcd897a8); /* statement */ 
downtimeArray[i] = IValidatorsData(dataAddress).verdicts(validatorIndex, i, 0);
coverage_0xdb799386(0x78a5c5f193f50d8399879c6f8d227d41cfb3161cc694319e8874f248b5fff01d); /* line */ 
            coverage_0xdb799386(0x34d9e2cc891f6a73d12926a3c401171c1885e47137e6da05cd5d5376af460225); /* statement */ 
latencyArray[i] = IValidatorsData(dataAddress).verdicts(validatorIndex, i, 1);
        }
coverage_0xdb799386(0xa08cc6f3b0d496f0556e190c2020d491d63a1d8e6f4fa5a8b40d6317e53d81e4); /* line */ 
        coverage_0xdb799386(0xc3fa9489a609ec3ee49a91d361d493444095ad39738908491644ba9f6d056625); /* statement */ 
if (lengthOfArray > 0) {coverage_0xdb799386(0x64860e171ba89a93773d02d4fa3858b1cba30dd221cb68e107bea1fc6b9784a1); /* branch */ 

coverage_0xdb799386(0x97f195a0599ecfa2080fd62e71fcab727b712e9ad6488580678bb45ac7b555e3); /* line */ 
            coverage_0xdb799386(0xca76b7ee8fe7aa9d1efea30a70322406992678632ce1e65e858c1a20e008cb76); /* statement */ 
averageDowntime = median(downtimeArray);
coverage_0xdb799386(0x1d8e2d8a3a7d30bcb6b60981d1f88a4d1d8e6441b3747950e2b11bb9b6d92a3d); /* line */ 
            coverage_0xdb799386(0xee5a66f6c075a9aecea94d38bc49559410b8a081c7d2b685503413992808d502); /* statement */ 
averageLatency = median(latencyArray);
coverage_0xdb799386(0x602f0c7873da89ed75482da723acfb59d5eddde2f5d5fb85373e34c8b8f50fd8); /* line */ 
            coverage_0xdb799386(0xbe9b294c7f5aa7040d43f2336e751ea7c6e485eef8cfb3d8940136ecde7b41ae); /* statement */ 
IValidatorsData(dataAddress).removeAllVerdicts(validatorIndex);
        }else { coverage_0xdb799386(0x6fbc4d7db8b1fc2934d5a1599298fc62d1389fe8be9748687c832a8e95fd4937); /* branch */ 
}
    }

    // function rotateNode(bytes32 schainId) external {
    //     uint newNodeIndexEvent;
    //     newNodeIndexEvent = selectNodeToGroup(schainId);
    //     emit ValidatorRotated(schainId, newNodeIndexEvent);
    // }

    // function selectNodeToGroup(bytes32 groupIndex) internal returns (uint) {
    //     address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
    //     require(IGroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");
    //     bytes32 groupData = IGroupsData(dataAddress).getGroupData(groupIndex);
    //     uint hash = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
    //     uint numberOfNodes;
    //     (numberOfNodes, ) = setNumberOfNodesInGroup(groupIndex, groupData);
    //     uint indexOfNode;
    //     uint iterations = 0;
    //     while (iterations < 200) {
    //         indexOfNode = hash % numberOfNodes;
    //         if (comparator(groupIndex, indexOfNode)) {
    //             IGroupsData(dataAddress).setException(groupIndex, indexOfNode);
    //             IGroupsData(dataAddress).setNodeInGroup(groupIndex, indexOfNode);
    //             return indexOfNode;
    //         }
    //         hash = uint(keccak256(abi.encodePacked(hash, indexOfNode)));
    //         iterations++;
    //     }
    //     require(iterations < 200, "Old Validator is not replaced? Try it later");
    // }

    function generateGroup(bytes32 groupIndex) internal allow(executorName) returns (uint[] memory) {coverage_0xdb799386(0xdb5fb823d6158593685cd5cb11e80dd86bdb0e65bf05979bcfb264ce158254a5); /* function */ 

coverage_0xdb799386(0x9502eef1555ec60eccdb6887d2996a300df70f2b141ff41852ed80fa76943e8c); /* line */ 
        coverage_0xdb799386(0x5aeed069c96a13841a099b5d91b1102f3d1ab82d0daf138e87e80733590375b5); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0x8b088d683f067c5d7019265a76bc92a3bcec4c10b978682796a3f930701ccc9e); /* line */ 
        coverage_0xdb799386(0x9e074438dd4a0851757c5bf8590a12dcbe529ea3ba142e119e33a3ce1967e24e); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));

coverage_0xdb799386(0xbf5a24381a7ffe62b4a619f3e7c6ee397ee79198c0f427ec205a460d13be8e2f); /* line */ 
        coverage_0xdb799386(0x6dd7571e0bcd0e466e4f857e4cfc324d6aac88bac534eb031a53079e543d6968); /* assertPre */ 
coverage_0xdb799386(0x9538f8e179586c93055cbf1e08f06ebb71d139cd346b9a443890091624083983); /* statement */ 
require(IGroupsData(dataAddress).isGroupActive(groupIndex), "Group is not active");coverage_0xdb799386(0x050dfd2dd28eed0b37a0d7a0ad679f8b8f18e31deb4481d07e99ec1019df864f); /* assertPost */ 


coverage_0xdb799386(0x54cfd331aa3257970593b1b07d6d27cfba3d7713d783156fd598dcdf2c9951b0); /* line */ 
        coverage_0xdb799386(0xb8530ad8b5326df30782fcc9b14f61faa4835e9c41fc7bf508807ab28cc6f110); /* statement */ 
uint exceptionNode = uint(IGroupsData(dataAddress).getGroupData(groupIndex));
coverage_0xdb799386(0x5f994baa4a034482d11ca4f34ba29cd5bd5d8dd1f9ed357ab665d0761657a36a); /* line */ 
        coverage_0xdb799386(0x20e6c272e45f18d2c2b61bb95c915fde1dbe799e29e5d7a42db5665d5d4095eb); /* statement */ 
uint[] memory activeNodes = INodesData(nodesDataAddress).getActiveNodeIds();
coverage_0xdb799386(0x7c2574901c7af8b0a809790de47a35ba76c71aa0240e1a294fbb093262d9dfca); /* line */ 
        coverage_0xdb799386(0x90df8a96313a9a7c1abf3be4192fd6f685e9df5fccee1ebc9b168cd7232101e9); /* statement */ 
uint numberOfNodesInGroup = IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
coverage_0xdb799386(0x25253d7b9e00997be74034347cf4c7a9bea164de76f3578794a1c60f5daa67e3); /* line */ 
        coverage_0xdb799386(0x9a231c1a1ac6d356fe77774e9bddc261d9fb27c164e03cec24992ea416ff5404); /* statement */ 
uint availableAmount = activeNodes.length - (INodesData(nodesDataAddress).isNodeActive(exceptionNode) ? 1 : 0);
coverage_0xdb799386(0x7f53523f993ac620261020f66c15a99d97c898be33ffe4dba0e5cef24121992e); /* line */ 
        coverage_0xdb799386(0x20727a35dec2a6bcdca322140583cff74ca58948a4426c8be2bd31dc5782c8b6); /* statement */ 
if (numberOfNodesInGroup > availableAmount) {coverage_0xdb799386(0xb1bddce66a20c783ec574150884b1a6b7eb4286ed7260348d2910b11a280ff10); /* branch */ 

coverage_0xdb799386(0x03d81b282abac1bc74a2fecf072eeb4145a7a86364092650be4dd3084bc209ba); /* line */ 
            coverage_0xdb799386(0xb6f99299c89ac1b9eaba2c16d4f0523ad6ba8e1cd5e126deded3e6cc121d9e99); /* statement */ 
numberOfNodesInGroup = availableAmount;
        }else { coverage_0xdb799386(0xec942cde325be9526e3fcc8cb0285584c1e416209a776304481f8409c6bd7950); /* branch */ 
}
coverage_0xdb799386(0x879fc18a0d0b4a4b33ddcab9914bf1cd4024464a732a91e45ea68b459f0d356b); /* line */ 
        coverage_0xdb799386(0x9198961dcd3f45d0baa841dd2ecccb05100184a573342c57dde1d2dc29524d22); /* statement */ 
uint[] memory nodesInGroup = new uint[](numberOfNodesInGroup);
coverage_0xdb799386(0x0738786f41923659a0502d85078467f5d0611e00e0896a4edeb384e18a33476c); /* line */ 
        coverage_0xdb799386(0xf3688c2b0e104ccda610653e09634dd7ee767e58097ac1720537332a75cb44af); /* statement */ 
uint ignoringTail = 0;
coverage_0xdb799386(0x73d54368adc15f20f7f1d5521c91da20e584ead4b480ebaac7c7311d12ab9a40); /* line */ 
        coverage_0xdb799386(0xd7a97a639efbb78918c0f36948af4adb95682b25c7e4117db62aea296becc7e3); /* statement */ 
uint random = uint(keccak256(abi.encodePacked(uint(blockhash(block.number - 1)), groupIndex)));
coverage_0xdb799386(0x54099b5b866cc083753dd2651d74dba9641b551401feed42d4e586f83e73cc91); /* line */ 
        coverage_0xdb799386(0xe05b7b5d4e64ae727a0df2bafee53412ed7b207ea6a362caf61d5501c3df666f); /* statement */ 
for (uint i = 0; i < nodesInGroup.length; ++i) {
coverage_0xdb799386(0x52adcf608d82e9e6dff0d893c4e433371377fbc9db400de779194a15e8dc748f); /* line */ 
            coverage_0xdb799386(0x1fecface6c836e2e16955d12afa9b8e79f2b8ba7e8a02d2c7f92be8036d4ffec); /* statement */ 
uint index = random % (activeNodes.length - ignoringTail);
coverage_0xdb799386(0x9b190d7266875b8268164a68bc94911b3e47564c3a556e9d9400f3f618c26a8e); /* line */ 
            coverage_0xdb799386(0x834648a1cbaf7a7fe9d22b6fbe5a77279fb805ba297108e5d0d4e04fcbf855d3); /* statement */ 
if (activeNodes[index] == exceptionNode) {coverage_0xdb799386(0xfa58fac22fbd24ae3b3dd2df2d7b78bd0f3bf51fea67422f7c812026949a626d); /* branch */ 

coverage_0xdb799386(0x4eeb7f7f3626095b1317d3994a0fabe85d172db99afdfd531c830284f5a795f8); /* line */ 
                coverage_0xdb799386(0x86203068bbba031c41ed689d3ac6a0b4ef9208347186e4e036ee32c00f9278a4); /* statement */ 
swap(activeNodes, index, activeNodes.length - ignoringTail - 1);
coverage_0xdb799386(0xcb96c4405a87f5565bf3783ff3048c8daa4e31a156d7eeebe087eaa82d5b925c); /* line */ 
                ++ignoringTail;
coverage_0xdb799386(0x85a16c62ebdfee07b9cb28af141efc90b393534d0055c431fe13fe22a6149a90); /* line */ 
                coverage_0xdb799386(0x76ac542ecb43a8f917676b6a84a6d264ca3a4595a23666efeb680f37b46baae9); /* statement */ 
index = random % (activeNodes.length - ignoringTail);
            }else { coverage_0xdb799386(0x1b9b5a29b66b90ff55c1d79c8459060896faba5e153fbe1b195d4b9a658cacc7); /* branch */ 
}
coverage_0xdb799386(0x5e92f869fa658a332dc20b21f72c9156c72d59bcc798193f6a51ad2f1dec8cfb); /* line */ 
            coverage_0xdb799386(0xef3113a5e728b3a3bf33f1b76b6c4623063be2ca16909bf0d8d95044938802c0); /* statement */ 
nodesInGroup[i] = activeNodes[index];
coverage_0xdb799386(0x12b4d8d694c498233d56fba77eb34ed64dcbc699f6c58cd55ea68fd49fc2defc); /* line */ 
            coverage_0xdb799386(0x49c88f9c6f6c813c6150fcd64ea3f9545bd117221427c0398d065cc41228f4d5); /* statement */ 
swap(activeNodes, index, activeNodes.length - ignoringTail - 1);
coverage_0xdb799386(0x99620e4481e17679efdd734fb0897d4fe2d007ac984bb642640614c052f72d91); /* line */ 
            ++ignoringTail;
coverage_0xdb799386(0x3198ca269ada3821c18755d5a7b1cda28211c06c37ac1f24f3125f3f84c7e6b7); /* line */ 
            coverage_0xdb799386(0x3665fbb49491e7fe1c0951f13c6212607028089b95d03f0acaa0563a81488ca5); /* statement */ 
IGroupsData(dataAddress).setNodeInGroup(groupIndex, nodesInGroup[i]);
        }
coverage_0xdb799386(0x9d6c0d0b2cee97fcadd910d656e9aa1164d8b390bb861f3162f07560abfca59f); /* line */ 
        coverage_0xdb799386(0x00083b8378c3f1eae55ba4506936e6934f3f52eaec74f505bd032d7ee05e0c95); /* statement */ 
emit GroupGenerated(
            groupIndex,
            nodesInGroup,
            uint32(block.timestamp),
            gasleft());
coverage_0xdb799386(0xea9a3e8d1bf7b7410d53fc97078344f96bf472a22b121aea8577e43d399c2db3); /* line */ 
        coverage_0xdb799386(0x768b6aad5358da202de79e21820e04f39e292e393122057b8c08a6202892b14e); /* statement */ 
return nodesInGroup;
    }

    function median(uint32[] memory values) internal pure returns (uint32) {coverage_0xdb799386(0xda8d9b5b141bee969ac4475f26a7ccc0678cf85284a6fd43dc80cfee06775d7d); /* function */ 

coverage_0xdb799386(0xeae431c52f336f9f2c861b4dbcb3e056d7cb6e4c70ac5426d36a594a2e2c6598); /* line */ 
        coverage_0xdb799386(0x03f566b2726e7401861e048686772f76ba07f5aaf430e99fbf604f053edf17ba); /* statement */ 
if (values.length < 1) {coverage_0xdb799386(0x6210d94a9ca584f7b829ffbe4b415bbb2038b50cd3d291bc2e8a629d3cdbb590); /* branch */ 

coverage_0xdb799386(0x0b40f235e60021b0132d7e03a3e097ee10a29de8e3b4487f1ecf9ae815c95649); /* line */ 
            coverage_0xdb799386(0x41f156dcf518405d72186b668d11864c5d4f731521f5488a8ab2a46dbd548e42); /* statement */ 
revert("Can't calculate median of empty array");
        }else { coverage_0xdb799386(0x48d30222df3112ff7c01ae4b977164747c490b12885e6e4fe72ab83fbeecbc2e); /* branch */ 
}
coverage_0xdb799386(0x3724ad30aacd53bb474ce1f5b7798ee25bb584bc7a19a3cf012d7b19ddab3ccc); /* line */ 
        coverage_0xdb799386(0x517c2e2cc25b4daaf5d57ff70fd1e34662139415fbb685bafc6f9e855a571da4); /* statement */ 
quickSort(values, 0, values.length - 1);
coverage_0xdb799386(0xb0f7ece6847a60e50b2d1f79964ae35682f0ed13a20524321316301a1ea35110); /* line */ 
        coverage_0xdb799386(0x5e67021348f110d112ca02d0971c09a78ba77192873c4039b458d00b1508adad); /* statement */ 
return values[values.length / 2];
    }

    function setNumberOfNodesInGroup(bytes32 groupIndex, bytes32 groupData) internal view returns (uint numberOfNodes, uint finish) {coverage_0xdb799386(0x597e2597d580bc267dcb79fa44c1a64c49ff4727b2166ca8609cfefe3718fa4c); /* function */ 

coverage_0xdb799386(0x03658338be971f84ad5fa74e4bc9402cd72a7fdd088c9e4b3737b74fbb52e612); /* line */ 
        coverage_0xdb799386(0x2b31ff367e94be904658e7af6e09b1bcbfbc65680c0c5be7c5a9c270482baf52); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0xdb799386(0x1f75080dfbab4a1906c8a550c34d98e4adecc9e6a2a2ad1e2073393d3a7d6de8); /* line */ 
        coverage_0xdb799386(0x2ca894b242e1ddbbb5abbf3cc16b33a386fa8570d179b19417579d156ebe1f02); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0x2887dacb5c5e08738479e33e4ce4905e6fb893658ccd56e91529a70a5db21c35); /* line */ 
        coverage_0xdb799386(0xeaecc347d35554d0e01f23d7854309846eb8206b508642502842d275f988e25f); /* statement */ 
numberOfNodes = INodesData(nodesDataAddress).getNumberOfNodes();
coverage_0xdb799386(0x56815328d96b299f6e30be313e20a1101e63ec70cb2731c929514e7dd5c9c1a3); /* line */ 
        coverage_0xdb799386(0xbbb1e1aadeed05b90b4e2fc00548d5a71e74d28ef65a09783c1f55a4a3b21a41); /* statement */ 
uint numberOfActiveNodes = INodesData(nodesDataAddress).numberOfActiveNodes();
coverage_0xdb799386(0xfc2aa6961ea0a39344d25ed5642b7992bb967180b24d38c650410c2acf654239); /* line */ 
        coverage_0xdb799386(0x4fb5abb08b26306cceb5a4f17e4fbd305fbbb0ba6299062fac207093cfe5b815); /* statement */ 
uint numberOfExceptionNodes = (INodesData(nodesDataAddress).isNodeActive(uint(groupData)) ? 1 : 0);
coverage_0xdb799386(0xbb1ebc531e492ef538a535b2bcd9caa95b4a3728d92363f422ffdd767cfdc6d0); /* line */ 
        coverage_0xdb799386(0x9695f7175d44caae2af1f24b27e97f99db90cd3af709bea6ac2339a3c223e939); /* statement */ 
uint recommendedNumberOfNodes = IGroupsData(dataAddress).getRecommendedNumberOfNodes(groupIndex);
coverage_0xdb799386(0x66981df1eb0b899a043f39ea882ad1bc12a4efaa18eed86f4373f501e54f557a); /* line */ 
        coverage_0xdb799386(0x6dc8da3c6f1642429432dbec46bec8865a4fc916c9dbb42f5a20dfbaeadcec05); /* statement */ 
finish = (recommendedNumberOfNodes > numberOfActiveNodes - numberOfExceptionNodes ?
            numberOfActiveNodes - numberOfExceptionNodes : recommendedNumberOfNodes);
    }

    function comparator(bytes32 groupIndex, uint indexOfNode) internal view returns (bool) {coverage_0xdb799386(0xe227814983f9f239012d7f11ca3113a97061517e7dd87f91b891c8f29ad0401c); /* function */ 

coverage_0xdb799386(0xb6fb9101c809c3c1313bfac337799ddd41bd88c1212d7fe0d3d5fdba33828ef4); /* line */ 
        coverage_0xdb799386(0xa85a05ef10860c09e9f2e1d1ed3ee898d5fce913afcbf84b8781cb44a6c4932a); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0xdb799386(0xa9acf277a02a04909b46bab8022d58ae476c91e9fca17538178d53a831a49a58); /* line */ 
        coverage_0xdb799386(0x6ea73b6ac30143d6bef92673cc14ea99ecdb7bda5b96b077aeb529f6374e18ae); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0xf53be6ccb9b570b5ea1b4ab473e41c6d455e51ac011e8d80b8e87a73a4637537); /* line */ 
        coverage_0xdb799386(0x5079e3544ef971cfe0f390b473ecc61098d54f9d4136b9f72b6fd11ffe1bfcb1); /* statement */ 
return INodesData(nodesDataAddress).isNodeActive(indexOfNode) && !IGroupsData(dataAddress).isExceptionNode(groupIndex, indexOfNode);
    }

    function setValidators(bytes32 groupIndex, uint nodeIndex) internal returns (uint) {coverage_0xdb799386(0x3987a79bffaa3b80f1a97ac874c5078e7290b56282b3a08d7451807647bf69da); /* function */ 

coverage_0xdb799386(0x57d461d8b95736e5d397bb2d15ce68f7988488c191b6d215f13056fe226923a9); /* line */ 
        coverage_0xdb799386(0x242cfaa960389de90620435395f1ee883598753838078ce443a859e0048af6e5); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0x7c04efb30026b58020f6a91dc1d2548c554595f4e56645618ee28d0766000885); /* line */ 
        coverage_0xdb799386(0x9478404d09cefe9a81aa9777f30702a5d7804b4ac24c1ccd1f31f49fe2263ded); /* statement */ 
IGroupsData(dataAddress).setException(groupIndex, nodeIndex);
coverage_0xdb799386(0x449796b8874a573a2f0f9df0551e4fe60292a322b5e0f9c581e6c1b28ee4d62b); /* line */ 
        coverage_0xdb799386(0x815c1bf925e6e5f3a71e5275b9077a31111a4c332aeab549a09d31866fff9be5); /* statement */ 
uint[] memory indexOfNodesInGroup = generateGroup(groupIndex);
coverage_0xdb799386(0x28f577388dd718715783c6074571fb1b91806101551869f29acaa5ed58eb7988); /* line */ 
        coverage_0xdb799386(0x59d48ac98c9e38547efa7313d992140b76cd83c3eff25c5e3af4dd11df6aabd7); /* statement */ 
bytes32 bytesParametersOfNodeIndex = getDataToBytes(nodeIndex);
coverage_0xdb799386(0x94e88817a2f81921cce1c9a03925bc16187ca13f55dd95cc82469edc97246185); /* line */ 
        coverage_0xdb799386(0x0b4761e08cd4b9988246efd152f61af7a43c5a00d7e9e7a2d309ec6348fe3214); /* statement */ 
for (uint i = 0; i < indexOfNodesInGroup.length; i++) {
coverage_0xdb799386(0x69297de224fe860fefb9f862c9077ed784eaa4b61ee69dd78008ea349197eee4); /* line */ 
            coverage_0xdb799386(0xa7dad0cb67e65d4753f36884aaf3eb101c3202a33bcda7461cc0ed2b1e1a9ac0); /* statement */ 
bytes32 index = keccak256(abi.encodePacked(indexOfNodesInGroup[i]));
coverage_0xdb799386(0xd4d85718e4b0c1d95804dc9ff85e388aedfedd39e66eea448c5cb2b2087a2fa7); /* line */ 
            coverage_0xdb799386(0x50104b93dcf6afc6daa4b324574e83073b02fa5077315eddf7a89606ae54bc38); /* statement */ 
IValidatorsData(dataAddress).addValidatedNode(index, bytesParametersOfNodeIndex);
        }
coverage_0xdb799386(0xda37aad60a2917d22084499dc9d0c2cb41c20c9bb0ce0ce385d3bf3bdcf4b960); /* line */ 
        coverage_0xdb799386(0x5d9a1a88f4a5bc961e0f2cac5c96adae168233ef42243b0bc025e1e48edde3a7); /* statement */ 
emit ValidatorsArray(
            nodeIndex,
            groupIndex,
            indexOfNodesInGroup,
            uint32(block.timestamp),
            gasleft());
coverage_0xdb799386(0x8c7c160fcdf2045c0c7a1e083377d2a78754e213bd83d1bcc5d58536724900d4); /* line */ 
        coverage_0xdb799386(0x89612df8087a160943b2bb2d37fea7b0274e5d936cb0f6488a618eb7652ef6cc); /* statement */ 
return indexOfNodesInGroup.length;
    }

    function find(bytes32 validatorIndex, uint nodeIndex) internal view returns (uint index, uint32 time) {coverage_0xdb799386(0x05cc50fd3592370c5cc1bac982f74ae82c70ae31510631cee38e6e01e1ade3f3); /* function */ 

coverage_0xdb799386(0x8ff84ff45558a0e019d909b25e49219b67fcdcb1f6b1d327e545402a2ba4258a); /* line */ 
        coverage_0xdb799386(0xd18d0088a6d00c0e24e146111e381a07f3f02119f3a9bb63ede378ca4f71dda9); /* statement */ 
address dataAddress = contractManager.contracts(keccak256(abi.encodePacked(dataName)));
coverage_0xdb799386(0xee95a077d9b0a0e3efaacbb70f51bf60d26aafbf5c4ad877c96b96441c24990f); /* line */ 
        coverage_0xdb799386(0x1b07b28d44af013e85eff7c5c2b8e771107353ed92284b45753573e37be8af3d); /* statement */ 
bytes32[] memory validatedNodes = IValidatorsData(dataAddress).getValidatedArray(validatorIndex);
coverage_0xdb799386(0xf219b811e170a429415ff2aea41dcec63e25e5c102946c76b1c73bb59dfebae1); /* line */ 
        coverage_0xdb799386(0x9f0db16bbb1902577ccdd4d7583e90cced1fa59dafa2381728506a305ee7aa4a); /* statement */ 
uint possibleIndex;
coverage_0xdb799386(0x62cb5cde7676cc63af484218ca4de86f4777d7bca3a1cc7c7f5ac0fefea0e513); /* line */ 
        coverage_0xdb799386(0x08390c7539ceaf94d899667a9a4f28f44a21768ccfacee5d90adb68adf548397); /* statement */ 
uint32 possibleTime;
coverage_0xdb799386(0xa7b0afd7f3c378f98c66ba3af7fcdb034aeddd9f9eb1b94d57a93d7f62a85832); /* line */ 
        coverage_0xdb799386(0xf1e53b2d815b110e5e5bb6cf6521eb684d76daa1baa440166af610667e4c0a33); /* statement */ 
for (uint i = 0; i < validatedNodes.length; i++) {
coverage_0xdb799386(0xfae7ddc173087fd0ba5f46002ee261c5005eb32b5996530bdf1f5b4279107b0b); /* line */ 
            coverage_0xdb799386(0x970ae284cef7bdef3d172d8b5115459b4e2487d99f4db2e53929caa3da0423cb); /* statement */ 
(possibleIndex, possibleTime) = getDataFromBytes(validatedNodes[i]);
coverage_0xdb799386(0xd508fb6cd7012b6d7a94fd4978e342e439f1eb622dfdb547810f77d50b04a0b2); /* line */ 
            coverage_0xdb799386(0x8f72a66dccffc950dc3896ef0c9e7a31621740590f6ce95dc7304828faada578); /* statement */ 
if (possibleIndex == nodeIndex && (time == 0 || possibleTime < time)) {coverage_0xdb799386(0x5bd4cfb340a1a5c4a0ca08657a641240d19a311d199dd7025a52f3d469114b3e); /* branch */ 

coverage_0xdb799386(0xdb2272c62d8f95f9d0dbc8c361374279368f033a80d805021f0dfa687bb28b5b); /* line */ 
                coverage_0xdb799386(0xb7117101b096fa2f957c7d99abefb814af456703c0cd0ae2a78aa3287d701cab); /* statement */ 
index = i;
coverage_0xdb799386(0xa44e5529347f732bb7f3395282b373b6cae5bf53a560f10897646449b44b16a1); /* line */ 
                coverage_0xdb799386(0x34bde6f19a242f1ee062c84a3cdb7dbe9a706bf5c33d606b867a6824e4b13e79); /* statement */ 
time = possibleTime;
            }else { coverage_0xdb799386(0x00813bbdcebb12bf0042b2d7b052f792f78d1ba76dce1218de7e39a1e807b19f); /* branch */ 
}
        }
    }

    function quickSort(uint32[] memory array, uint left, uint right) internal pure {coverage_0xdb799386(0x3d9bf1c8d2a9744fbaec41ace74ef4ddb1af0f5ad0c8d24fbeb4b9f8d3e7e40f); /* function */ 

coverage_0xdb799386(0x790a17bb2d87519070b496fb72b8c53482f5bf70795709bd70c38fce75538f54); /* line */ 
        coverage_0xdb799386(0x7deccc7471714aea8bce222ad3912bad0cf0af9bb96796701f96fc103332fac1); /* statement */ 
uint leftIndex = left;
coverage_0xdb799386(0xecdf1c9227e15b5f14e26169d566bd3da868ed5c3234a0006321233316410b29); /* line */ 
        coverage_0xdb799386(0x2e0f3e8ba907b20fbe7607ba3e6ee83bad96bbae72e5a1056ad0d04588ca9ee1); /* statement */ 
uint rightIndex = right;
coverage_0xdb799386(0xdfc9b9a4e6fb4adac5ffb2824aa223fbf7f71eb2f3ea4cdbdca673314b212dc4); /* line */ 
        coverage_0xdb799386(0x34d3cc64dcc515d118924da173990f13b4ac4eecceedc1c7c45bcc0239767b9b); /* statement */ 
uint32 middle = array[(right + left) / 2];
coverage_0xdb799386(0x776bc5530669b98d8a3794d1877c8044d774c0a977f26c725d0e798ccb3c3f49); /* line */ 
        coverage_0xdb799386(0xa9825d02f20ae50bb8b925ff2f2d0e4c7f6bf011322d9dcfbbbe538855059479); /* statement */ 
while (leftIndex <= rightIndex) {
coverage_0xdb799386(0xfe5071a54f8207bc48c6408331ba613c938d64ac82fcd99d4bff1b78e6c2b1ec); /* line */ 
            coverage_0xdb799386(0x633886d58c532b90f6b1b49a711f13d1e289c168e437ba173aa5392e4e32fe60); /* statement */ 
while (array[leftIndex] < middle) {
coverage_0xdb799386(0xa71d7f61ac4708aba00b582b4924c9a8e3b6c48af81e6454446add12c37bf0b2); /* line */ 
                leftIndex++;
                }
coverage_0xdb799386(0xd5dc903a68dad175c010c13bce32e51fced873b2e62f97c488912091e8047651); /* line */ 
            coverage_0xdb799386(0x955771cdc36a469630783de3c61225a48a8f3d48b71e2874563714165b650b2c); /* statement */ 
while (middle < array[rightIndex]) {
coverage_0xdb799386(0x3cff3b729fe1720eb455ed0fd8f489fbbdd1f157f4492fdedb0203bd5ce8705c); /* line */ 
                rightIndex--;
                }
coverage_0xdb799386(0x0afe68caad3826cf30794070f24653097fd291289e74d1f998c9bbe0c9960bff); /* line */ 
            coverage_0xdb799386(0xeb6552692375bb27fec8839d534f36c11dc5bc29c9f3ae826185fba769e76b06); /* statement */ 
if (leftIndex <= rightIndex) {coverage_0xdb799386(0xc763f69a5044e7603b088d6cf0c1411fa038d9d1b82759d6cd4af82b555f2366); /* branch */ 

coverage_0xdb799386(0xb38eb608ad572f0b5228575655b95b77a84336e8431a5f75f62b968c98155463); /* line */ 
                coverage_0xdb799386(0x4af950c75e4069a8680a63f02b2948b256a81a4468df24828a37b06af414da8d); /* statement */ 
(array[leftIndex], array[rightIndex]) = (array[rightIndex], array[leftIndex]);
coverage_0xdb799386(0x2425db648883230a259529d6c4d02880214b41066c8158cde1c9f8b8084e745b); /* line */ 
                leftIndex++;
coverage_0xdb799386(0xd18d8608fad54569852d4cbfd55a0e5b3d9597cf5280f1bbdf1019570c4c1004); /* line */ 
                coverage_0xdb799386(0xad57b1ef093c9a28e2886bc7d6816f2ecc5f435ac9104d6ff1144bc0c36ed75b); /* statement */ 
rightIndex = (rightIndex > 0 ? rightIndex - 1 : 0);
            }else { coverage_0xdb799386(0x3af9d349c5a1885d379d7bf3f811910e44ca0326292d27b6e6c02688e438790f); /* branch */ 
}
        }
coverage_0xdb799386(0xbcd1a5a4d70a896eeddeceffb88dda042722a266d914681ddbd66b7c04c4634c); /* line */ 
        coverage_0xdb799386(0x2630dfd413506f55ca1cfc4839e57410bdca2d9ec745f4ab575c47f1e9b35fb4); /* statement */ 
if (left < rightIndex)
            {coverage_0xdb799386(0x1233731e3a35d8c5ec7c633f36767f23e16897c3798b8aadeb3f187a95e52aad); /* statement */ 
coverage_0xdb799386(0x39edc5a2243d873edafe5b336ee395406a15127794f90da814dd9615317cbeae); /* branch */ 
coverage_0xdb799386(0x341441cd162f3719042bfb63fd864c2ae672a4ca55fe1c0a70e617f228241898); /* line */ 
quickSort(array, left, rightIndex);}else { coverage_0xdb799386(0x3032716a313f328a71cf703f5c6cbd73b6a83b95e4850779c04808763502d3e8); /* branch */ 
}
coverage_0xdb799386(0xed1a67a297d3ae580017edd88d65e3525c901e6731d8e98a26057255601c9ffc); /* line */ 
        coverage_0xdb799386(0xe8fada8ce4a506ac4a0dc559ccffc97a604640b3d44ff0bc0f565933270e1057); /* statement */ 
if (leftIndex < right)
            {coverage_0xdb799386(0xd1cc6ae6fe56e82653604898b44a79311664e91811a25ab7964634601c5fe32c); /* statement */ 
coverage_0xdb799386(0xd9b356e03c8d3d8e199a45bf628532d9066fa165fbd53b0eff306dcdd9e82514); /* branch */ 
coverage_0xdb799386(0xe1b9306fbc9969de7a02945d10cacd637fdc526e0abc343d09d3554be6907f23); /* line */ 
quickSort(array, leftIndex, right);}else { coverage_0xdb799386(0x0c59c7cbd5742f005941e7556ba8eaf704c736f8106e0c7439456fbeb03288c4); /* branch */ 
}
    }

    function getDataFromBytes(bytes32 data) internal pure returns (uint index, uint32 time) {coverage_0xdb799386(0x576938cd38a1c70436dbb12062617d725a8efa11be0dc2f1331e27b82ed12fc3); /* function */ 

coverage_0xdb799386(0x4f3677ee132c2bbabc9586ef1c68984dcddc87623056603e6b9694ccd2f1e2e3); /* line */ 
        coverage_0xdb799386(0x784763a1bd6262fee0963de9d2bc0ac32831086d50d78c0604ff9db2287c8e89); /* statement */ 
bytes memory tempBytes = new bytes(32);
coverage_0xdb799386(0x904907572d50e8e1d3533d8a2f84d18ee44f28d3d98ff4794cd6e8941ca3bf9e); /* line */ 
        coverage_0xdb799386(0x3bec665cd8e4c9436d05346c66fa54ed964ddcb9780a61f0d99228597216cdd3); /* statement */ 
bytes14 bytesIndex;
coverage_0xdb799386(0x414187492d753ed46a522d8a622eb7bdf5fb3dd6c255ffcee1ef5fbe84087a31); /* line */ 
        coverage_0xdb799386(0xe3b9871457e6bff20e23e891bbf1853c1f8a5757cb16403cae9bcf41f1466848); /* statement */ 
bytes14 bytesTime;
coverage_0xdb799386(0xcfaed079adace342211f96dee76e4b73b95fc962e8f2b8ea4990858a7366ed21); /* line */ 
        assembly {
            mstore(add(tempBytes, 32), data)
            bytesIndex := mload(add(tempBytes, 32))
            bytesTime := mload(add(tempBytes, 46))
        }
coverage_0xdb799386(0x045625b6521633ee6c36c830e00bc9ad57420c4b007661a46b4696e695df0c0d); /* line */ 
        coverage_0xdb799386(0x455d75a25b30cc30c875e581be6ad28a6aa5d9d4277c8e8912008c629583d3b2); /* statement */ 
index = uint112(bytesIndex);
coverage_0xdb799386(0x6533896d27034d0664c0797430322f9d019454455306845ee6fc35e0d1d98fd5); /* line */ 
        coverage_0xdb799386(0x1af5cc1375ba0a39879a4cfac80799a58bce05fe138fd0526a1717b57a2b23e6); /* statement */ 
time = uint32(uint112(bytesTime));
    }

    function getDataToBytes(uint nodeIndex) internal view returns (bytes32 bytesParameters) {coverage_0xdb799386(0xbade6e6491424ac7181c89522aedfb9a95c7d0b9fbb53589f6d5230ecb654b4d); /* function */ 

coverage_0xdb799386(0x9b5b83e9f07b1b4f1ae982efddac28aea306e3e5359e51d9c2e790529b2eeeae); /* line */ 
        coverage_0xdb799386(0xa0ca45acfd5188a655a7914b8b8f5d625f7740fe59b9d5e69e619ac816de9eac); /* statement */ 
address constantsAddress = contractManager.contracts(keccak256(abi.encodePacked("Constants")));
coverage_0xdb799386(0x383059935205358e86789a1e7136d3d06783676671f509b171a7d7341607af84); /* line */ 
        coverage_0xdb799386(0xc508db4d9a79ea046a8427d1e755076df7110ff4fc0599ad5f0262a5d06c4495); /* statement */ 
address nodesDataAddress = contractManager.contracts(keccak256(abi.encodePacked("NodesData")));
coverage_0xdb799386(0xb7a05a1ae043a2ff6c92db105026a3a9504cb342fd3f61761d2604f75fe418c6); /* line */ 
        coverage_0xdb799386(0xe8d27fb1006ab71172ccd6c83e508148bdb9bacc98fbbef749fe12211670beed); /* statement */ 
bytes memory tempData = new bytes(32);
coverage_0xdb799386(0xbdc475b730eb0c77b75581a3e18c66a30c4c2a103bc7f81561df1c117ff8b70b); /* line */ 
        coverage_0xdb799386(0x055b504e5a1d4a065aad309f6dc8f1b5c3f9e0534cf50185434743c1fda53439); /* statement */ 
bytes14 bytesOfIndex = bytes14(uint112(nodeIndex));
coverage_0xdb799386(0xdb79f03e1b57ae734d452e4c6f7f595264b5771f63d23b426b0cb1a9ccef0ab3); /* line */ 
        coverage_0xdb799386(0x3697427f14256958a74e016f2feea59409a9562fa793cc7c1354a46288fc0063); /* statement */ 
bytes14 bytesOfTime = bytes14(
            uint112(INodesData(nodesDataAddress).getNodeNextRewardDate(nodeIndex) - IConstants(constantsAddress).deltaPeriod())
        );
coverage_0xdb799386(0x9562bee0c0f7494f5e58b652847e700bdb8a1bd9fcb2a1cb0365dbc1a9e58fa9); /* line */ 
        coverage_0xdb799386(0x884228594cd82ce49394f668ef569ef14e0270054443b52c497667b1858276d9); /* statement */ 
bytes4 ip = INodesData(nodesDataAddress).getNodeIP(nodeIndex);
coverage_0xdb799386(0x5cd95950269210c984aeb0edd62c439e62e6de7af2a6b83fbe6bc05982f8995f); /* line */ 
        assembly {
            mstore(add(tempData, 32), bytesOfIndex)
            mstore(add(tempData, 46), bytesOfTime)
            mstore(add(tempData, 60), ip)
            bytesParameters := mload(add(tempData, 32))
        }
    }
}
