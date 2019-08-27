pragma solidity ^0.5.0;

contract RC4 {
    
    function encrypt(uint256 number, bytes32 key) public pure returns(bytes32 ciphertext) {
        bytes32 numberBytes = bytes32(number);
        bytes memory tmp = new bytes(32);
        for (uint8 i = 0; i < 32; i++) {
            tmp[i] = numberBytes[i] ^ key[i];
        }
        assembly {
            ciphertext := mload(add(tmp, 32))
        }
    }
    
    function decrypt(bytes32 ciphertext, bytes32 key) public pure returns (uint256 number) {
        bytes memory tmp = new bytes(32);
        for (uint8 i = 0; i < 32; i++) {
            tmp[i] = ciphertext[i] ^ key[i];
        }
        bytes32 numberBytes;
        assembly {
            numberBytes := mload(add(tmp, 32))
        }
        number = uint256(numberBytes);
    }
}