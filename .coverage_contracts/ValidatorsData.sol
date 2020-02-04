/*
    ValidatorsData.sol - SKALE Manager
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

import "./GroupsData.sol";


contract ValidatorsData is GroupsData {
function coverage_0xe3388ada(bytes32 c__0xe3388ada) public pure {}



    struct Metrics {
        uint32 downtime;
        uint32 latency;
    }

    struct Validator {
        uint nodeIndex;
        bytes32[] validatedNodes;
        Metrics[] verdicts;
    }

    mapping (bytes32 => bytes32[]) public validatedNodes;
    //mapping (bytes32 => Metrics[]) public verdicts;
    mapping (bytes32 => uint32[][]) public verdicts;

    constructor(string memory newExecutorName, address newContractsAddress) GroupsData(newExecutorName, newContractsAddress) public {coverage_0xe3388ada(0xa8509c2930d1a91832bcf57c0aafa4f00558722ed0b7d728275c635f51dbe173); /* function */ 


    }

    /**
     *  Add validated node or update existing one if it is already exits
     */
    function addValidatedNode(bytes32 validatorIndex, bytes32 data) external allow(executorName) {coverage_0xe3388ada(0x37ffffa0724709a902cd744facbeddf3e0ca0a160543a1fe23032538dc3f41c9); /* function */ 

coverage_0xe3388ada(0xac033af74a215d802a045711433ed9c076a72b6a8093c5094938fec316150625); /* line */ 
        coverage_0xe3388ada(0xc5b25ed2e99e548d3a4d63fceb12e38185e2d00cf25279130f6fe54fbe4b21ec); /* statement */ 
uint indexLength = 14;
coverage_0xe3388ada(0xc0f750682b1d2433b3e065c38191ac94e5db8df327939910eb1119280da348fc); /* line */ 
        coverage_0xe3388ada(0xb6fbe4653dd9a459a23d4fd5bef20bf6edbdef3533f17a6fb5805e064194d075); /* assertPre */ 
coverage_0xe3388ada(0x3916a4c564d6363b7bab0396ddd24baba7cba1cde486ceff0716ba948b1c252b); /* statement */ 
require(data.length >= indexLength, "data is too small");coverage_0xe3388ada(0xf633cb714fca38a3fb4e2865fafde57831d426b9de92e9285ecaf80646086ab9); /* assertPost */ 

coverage_0xe3388ada(0xdbd5ce3c6cb7be6bd2dfd17dc948fefea54ce422638a1a8cc932314f6b093610); /* line */ 
        coverage_0xe3388ada(0x13e0c8110174bb3271fc0319b0a6faa0d6b14a56fa313f8f3220bfe2a40e9bd0); /* statement */ 
for (uint i = 0; i < validatedNodes[validatorIndex].length; ++i) {
coverage_0xe3388ada(0x13a640ad4429e0c5d4cdd2b245282a94c46047eac917c563394a523996a204ef); /* line */ 
            coverage_0xe3388ada(0xe3234bd2bd473765707eb64fb92a89608a5d16ff149e1a984452030b4dbbc804); /* assertPre */ 
coverage_0xe3388ada(0xf5017f544e850bd8f181d3db8dd22f3bd73a8cba6df02f1da3538bb4dae0d0ea); /* statement */ 
require(validatedNodes[validatorIndex][i].length >= indexLength, "validated nodes data is too small");coverage_0xe3388ada(0x00bab582ff81ec64351144a97bef88e922ce8d34c2dc4731b421f76db844db1a); /* assertPost */ 

coverage_0xe3388ada(0x812b12a433d39917b9e3371bc328133ae609d94925bc68b5910a31721e3ce529); /* line */ 
            coverage_0xe3388ada(0xdc2e5c6f60c9d334d7da0d95d599972f04a914f4abaa432a7a3d8229c0aaacc0); /* statement */ 
uint shift = (32 - indexLength) * 8;
coverage_0xe3388ada(0x2816d3f7bee7d561c96c6f12b21b0f3d115b5176bd237294e2349950e886f8c8); /* line */ 
            coverage_0xe3388ada(0x8bf9348c60d78356e99bb779dae88374f918290651340059d9ba2a073923f6dc); /* statement */ 
bool equalIndex = validatedNodes[validatorIndex][i] >> shift == data >> shift;
coverage_0xe3388ada(0xb62126001116f86aceefc29b06bec6047308812090fa5a0366a0a18e08d9a619); /* line */ 
            coverage_0xe3388ada(0x7d26b8861682f81f038be5efc70d1d1f471645132ea3db543f4a6894352be9d5); /* statement */ 
if (equalIndex) {coverage_0xe3388ada(0x7736a2d5ce46148c00c1d4aaeadebfb7aa118b6213fe27bc5208996d02d6bb09); /* branch */ 

coverage_0xe3388ada(0xc6b8e342b6e647d0d867569220af9fc9d20e218328c4aacf796d57ad0d19b47f); /* line */ 
                coverage_0xe3388ada(0x6cecb1584d7bb7d9269dca4af4287ef91e125e479f784166f58504824cdf54b6); /* statement */ 
validatedNodes[validatorIndex][i] = data;
coverage_0xe3388ada(0x55929ae1b71f09cb32192248132343e038d88b19c61b06a681c73aa50d60370f); /* line */ 
                coverage_0xe3388ada(0x2fe48a0d50940a8769590512943b6b9dea9a7c59419443da6a3514690ac0bd93); /* statement */ 
return;
            }else { coverage_0xe3388ada(0x0b0c4512bbaf49832efb5593fd6441f78be4ae0d1eea9441074ff1530ea70fd3); /* branch */ 
}
        }
coverage_0xe3388ada(0xb9fad465fde7eb3a2314e7934abe9121e2a8ab74dbff309caf3cb791753d5081); /* line */ 
        coverage_0xe3388ada(0x09def50ddd9bad0a304f0f0d3fb0a3779dcc8e8aae6f5294b3013b187523fbea); /* statement */ 
validatedNodes[validatorIndex].push(data);
    }

    function addVerdict(bytes32 validatorIndex, uint32 downtime, uint32 latency) external allow(executorName) {coverage_0xe3388ada(0xfee4575939bc8a0e2e6162bba9ffe61b459f6878092f3722c55f45dfb697792c); /* function */ 

coverage_0xe3388ada(0x88184481cfcc3845571fd91888fbaa314c1f0819edfadab9594061e09eb4b6ee); /* line */ 
        coverage_0xe3388ada(0x23432cb37ea09f01824d01367778bb921292d34f580e31a88c48bb04e7a81ef7); /* statement */ 
verdicts[validatorIndex].push([downtime, latency]);
    }

    function removeValidatedNode(bytes32 validatorIndex, uint indexOfValidatedNode) external allow(executorName) {coverage_0xe3388ada(0x06bb59a099c1d3dd2cc90ae40765a246fbce26fc3500b1c0f57eda8771fb1541); /* function */ 

coverage_0xe3388ada(0xde09e22898102ae048771229e93eceabfc58283069ea394d222575f9ba2b13d1); /* line */ 
        coverage_0xe3388ada(0x20826b21a92b18f52d7310b766595f613ad2405097e7d31e7df38af16b591e3f); /* statement */ 
if (indexOfValidatedNode != validatedNodes[validatorIndex].length - 1) {coverage_0xe3388ada(0xf50b6ab6fe1c567ab583776294ff640e95db56c1d5fb7feef12ee0cd9e8e90ec); /* branch */ 

coverage_0xe3388ada(0x388bad1bfc404b79bc80d334b371b8536d6cc1d42a2aa0ffa8b1ce4f83ad1933); /* line */ 
            coverage_0xe3388ada(0x28f619e12c496aadde48dd5a457a4af9b6a2731aa04860bb5af2099de8b74ddc); /* statement */ 
validatedNodes[validatorIndex][indexOfValidatedNode] = validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
        }else { coverage_0xe3388ada(0x1a59076111d8cc3b16406cfa279ebe85a37dbfdc59d79184a80e34498f420887); /* branch */ 
}
coverage_0xe3388ada(0x93f584f603b89374538c3d2f4e078333e42ac1c90c193c080ca2de3945f86b82); /* line */ 
        delete validatedNodes[validatorIndex][validatedNodes[validatorIndex].length - 1];
coverage_0xe3388ada(0xa725136c015bf764c06ddd3eab628ed03b21fc0ab13fba38705a9fcce59cf092); /* line */ 
        validatedNodes[validatorIndex].length--;
    }

    function removeAllValidatedNodes(bytes32 validatorIndex) external allow(executorName) {coverage_0xe3388ada(0x411efbdb9d56e19b5e187a64c0901c5745c92d4dfe27264280b70be4d9238e3c); /* function */ 

coverage_0xe3388ada(0xda2a90e6c196c6179e028c4b05231e677d802385861dc6ffb5af1b90c704d943); /* line */ 
        delete validatedNodes[validatorIndex];
    }

    function removeAllVerdicts(bytes32 validatorIndex) external allow(executorName) {coverage_0xe3388ada(0xcb4f7013f1e5cd9fee8f5135f763c911d120de9c529c687bfc6c7f932dca0a9d); /* function */ 

coverage_0xe3388ada(0x02d50d94c50f863c48b8c4d034c9563690e3645d3104ae1d78d473efc1fe8d18); /* line */ 
        coverage_0xe3388ada(0x190ec7574eb8be0802c145630aee29d7f4da5b18f5f278f63c31e4806e4abdfa); /* statement */ 
verdicts[validatorIndex].length = 0;
    }

    function getValidatedArray(bytes32 validatorIndex) external view returns (bytes32[] memory) {coverage_0xe3388ada(0x92da98d813e4c10b1530922fb96a89567f954eb81f9d744a441e7b14d5a0c205); /* function */ 

coverage_0xe3388ada(0x5844f46c9a35e4c098d5779e5dfa784969a75c4cc724960ab3b41982c37e5149); /* line */ 
        coverage_0xe3388ada(0x23edf05f5b527b35ec11d66c55bee92c9e3eb6a8414161f28fa34db4c9275154); /* statement */ 
return validatedNodes[validatorIndex];
    }

    function getLengthOfMetrics(bytes32 validatorIndex) external view returns (uint) {coverage_0xe3388ada(0x1077ebe5a9f160316935c80c1f19f6c5ac274e3135574e8d9dab6eba14ba2eea); /* function */ 

coverage_0xe3388ada(0x1c6b193a4cf853d0e140009e370a146992af01a66384b3c4ddb60e1ffdb2286c); /* line */ 
        coverage_0xe3388ada(0xf70ec38a46e9e8c58010b4de7ded5711b69b0fe051c6b79562b4bb8724d6469c); /* statement */ 
return verdicts[validatorIndex].length;
    }
}
