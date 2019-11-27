pragma solidity ^0.5.3;


contract Decryption {

    function encrypt(uint256 secretNumber, bytes32 key) external pure returns (bytes32 ciphertext) {
        bytes32 numberBytes = bytes32(secretNumber);
        bytes memory tmp = new bytes(32);
        for (uint8 i = 0; i < 32; i++) {
            tmp[i] = numberBytes[i] ^ key[i];
        }
        assembly {
            ciphertext := mload(add(tmp, 32))
        }
    }

    function decrypt(bytes32 ciphertext, bytes32 key) external pure returns (uint256 secretNumber) {
        bytes memory tmp = new bytes(32);
        for (uint8 i = 0; i < 32; i++) {
            tmp[i] = ciphertext[i] ^ key[i];
        }
        bytes32 numberBytes;
        assembly {
            numberBytes := mload(add(tmp, 32))
        }
        secretNumber = uint256(numberBytes);
    }
}