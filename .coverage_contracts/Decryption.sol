/*
    Decryption.sol - SKALE Manager
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


contract Decryption {
function coverage_0x2e7cd5c0(bytes32 c__0x2e7cd5c0) public pure {}


    function encrypt(uint256 secretNumber, bytes32 key) external pure returns(bytes32 ciphertext) {coverage_0x2e7cd5c0(0x55dd51bfe2417e0f1ab617dc6c74c15b15d922f67a9584ac89aa2330c1670ad7); /* function */ 

coverage_0x2e7cd5c0(0x578b85248a30e17fcf4acf1d7e56cd80c20a974848e31051a6eae15140444611); /* line */ 
        coverage_0x2e7cd5c0(0xd7254f4768af6fa58bacffcacfb22c83741905897d5e3977baab08a1a82678f7); /* statement */ 
bytes32 numberBytes = bytes32(secretNumber);
coverage_0x2e7cd5c0(0x64cb75cdfd21913fcc655c753a3dfd6bef2d0052c5efd5340b47bdb3885be153); /* line */ 
        coverage_0x2e7cd5c0(0x6433d31a18f44edbe036e78371a575d3e353fca822012e4cf8fc1ac13eb784ce); /* statement */ 
bytes memory tmp = new bytes(32);
coverage_0x2e7cd5c0(0xa405b28cc325497cf3e947f86f098a101eb6ac3f05752c8fad4915b943eaf530); /* line */ 
        coverage_0x2e7cd5c0(0xf13377e83be31182d6abf5cefe13d48f0a4c82587e5d3f8d99c6398b36355b7c); /* statement */ 
for (uint8 i = 0; i < 32; i++) {
coverage_0x2e7cd5c0(0xdf251ae020c389d451a18aead490e0af85acc01e9a9626a55bc25e15959a4d7f); /* line */ 
            coverage_0x2e7cd5c0(0x4c7bf666d374404685c0985cf614988abeb3ea8528fb1265975ec1c50d83831a); /* statement */ 
tmp[i] = numberBytes[i] ^ key[i];
        }
coverage_0x2e7cd5c0(0xf14bb84d73c7e59d7ff4eb68990ba3cd81a5573d27338af2a7dba4e0d083ba65); /* line */ 
        assembly {
            ciphertext := mload(add(tmp, 32))
        }
    }

    function decrypt(bytes32 ciphertext, bytes32 key) external pure returns (uint256 secretNumber) {coverage_0x2e7cd5c0(0xb568ff940a33bafbce223eaae5e7c92146dc95bd3aa6605f6159b93603eaea80); /* function */ 

coverage_0x2e7cd5c0(0x9dd6b5e89097bd891f2c2c3314caed8a84f5a5a71683a8c65a57933a47d3aed9); /* line */ 
        coverage_0x2e7cd5c0(0x64f36f15ead2a239f8b62c2595f3dd386d2e87a10d815e906a26d5c0a2a49541); /* statement */ 
bytes memory tmp = new bytes(32);
coverage_0x2e7cd5c0(0x38415e4646122f01cb63d6ed39f9bd3329986ad70b17e6d60a3b33543d3e1b8c); /* line */ 
        coverage_0x2e7cd5c0(0xc9cfe0f01ee5cfbc605672108553cbbc220dcfeb9860e92044205d9db32597b0); /* statement */ 
for (uint8 i = 0; i < 32; i++) {
coverage_0x2e7cd5c0(0xebde3bc743fb109f28d0de05b7f35fe34d0ef6f6bdfd3c1c3b43c98443436760); /* line */ 
            coverage_0x2e7cd5c0(0xa9085c12abe0cb5379e50b4558ea9695b6ee4562374bd42bb7a1f8004edea252); /* statement */ 
tmp[i] = ciphertext[i] ^ key[i];
        }
coverage_0x2e7cd5c0(0xeb3e0520d598ee1629375abee5a9a71279c8790a6f855cd53c77b5a290a394f3); /* line */ 
        coverage_0x2e7cd5c0(0xa55b94560ddd38814a62dd59733593223137424fd53aea580175fb9e8a9771b6); /* statement */ 
bytes32 numberBytes;
coverage_0x2e7cd5c0(0x6b3760ab5495ccde4c12f33d42b8b8af5c1f8aa3be00200eb4ae14e9773c03af); /* line */ 
        assembly {
            numberBytes := mload(add(tmp, 32))
        }
coverage_0x2e7cd5c0(0x9ba91b3131bd9bc01030521572ac7789d5b353f5e1da2a65fdf1b800b8f25d3b); /* line */ 
        coverage_0x2e7cd5c0(0x35c49955102c8dac3cc46b6ecc4d586a05d9122c0497f27f281a32aa48775f94); /* statement */ 
secretNumber = uint256(numberBytes);
    }
}