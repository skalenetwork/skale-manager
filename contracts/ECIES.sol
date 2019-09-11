pragma solidity ^0.5.0;


contract AES {

    struct Box {
        bytes32[8] lines;
    }

    event Encrypted(bytes);
    event Decrypted(string);

    Box sbox;
    Box invSbox;

    uint8 nR;
    uint8 nK;
    uint8 nB = 4;

    bool sboxSet;
    bool invSboxSet;

    bytes10 rcon = 0x01020408102040801b36;

    address owner;

    modifier isInitialized() {
        require(sboxSet && invSboxSet, "Not initialized");
        _;
    }

    constructor(uint16 typeOfAES) public {
        owner = msg.sender;
        if (typeOfAES == 128) {
            nR = 10;
            nK = 4;
        } else if (typeOfAES == 192) {
            nR = 12;
            nK = 6;
        } else if (typeOfAES == 256) {
            nR = 14;
            nK = 8;
        } else {
            revert("Incorrect type of AES");
        }
    }

    function setSbox() public {
        require(!sboxSet, "Already set");
        sbox.lines[0] = 0x637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0;
        sbox.lines[1] = 0xb7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275;
        sbox.lines[2] = 0x09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf;
        sbox.lines[3] = 0xd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2;
        sbox.lines[4] = 0xcd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb;
        sbox.lines[5] = 0xe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08;
        sbox.lines[6] = 0xba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e;
        sbox.lines[7] = 0xe1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16;
        sboxSet = true;
    }

    function setInvSbox() public {
        require(!invSboxSet, "Already set");
        invSbox.lines[0] = 0x52096ad53036a538bf40a39e81f3d7fb7ce339829b2fff87348e4344c4dee9cb;
        invSbox.lines[1] = 0x547b9432a6c2233dee4c950b42fac34e082ea16628d924b2765ba2496d8bd125;
        invSbox.lines[2] = 0x72f8f66486689816d4a45ccc5d65b6926c704850fdedb9da5e154657a78d9d84;
        invSbox.lines[3] = 0x90d8ab008cbcd30af7e45805b8b34506d02c1e8fca3f0f02c1afbd0301138a6b;
        invSbox.lines[4] = 0x3a9111414f67dcea97f2cfcef0b4e67396ac7422e7ad3585e2f937e81c75df6e;
        invSbox.lines[5] = 0x47f11a711d29c5896fb7620eaa18be1bfc563e4bc6d279209adbc0fe78cd5af4;
        invSbox.lines[6] = 0x1fdda8338807c731b11210592780ec5f60517fa919b54a0d2de57a9f93c99cef;
        invSbox.lines[7] = 0xa0e03b4dae2af5b0c8ebbb3c83539961172b047eba77d626e169146355210c7d;
        invSboxSet = true;
    }

    function encrypt(string memory plainText, bytes memory key) public view isInitialized returns (bytes memory){
        require(bytes(plainText).length <= 16, "Incorrect length of plainText");
        bytes memory newPlainText = new bytes(16);
        for (uint8 i = 0; i < 16; i++) {
            if (i < bytes(plainText).length) {
                newPlainText[i] = bytes(plainText)[i];
            } else {
                newPlainText[i] = bytes1(0);
            }
        }
        return encrypt1(newPlainText, key);
    }

    function decrypt(bytes memory cipherText, bytes memory key) public view isInitialized returns (string memory){
        bytes memory plainText = decrypt1(cipherText, key);
        string memory newPlainText;
        for (uint8 i = 0; i < plainText.length; i++) {
            bytes(newPlainText)[i] = plainText[i];
        }
        return newPlainText;
    }

    function encrypt1(bytes memory plainText, bytes memory cipherKey) public view isInitialized returns (bytes memory) {
        uint8 nr = nR;
        uint8 nk = nK;
        uint8 nb = nB;
        require(plainText.length == 4 * nb && cipherKey.length == 4 * nk, "Incorrect data");
        bytes memory keySchedule = keyExpansion(cipherKey);
        bytes16 tmp;
        assembly {
            tmp := mload(add(keySchedule, 32))
        }
        bytes memory roundKey = new bytes(4 * nb);
        bytes memory state = new bytes(4 * nb);
        for (uint8 i = 0; i < 4 * nb; i++) {
            roundKey[i] = tmp[i];
            state[i] = plainText[i];
        }
        state = addRoundKey(state, roundKey);
        for (uint8 i = 1; i < nr; i++) {
            state = subBytes(state);
            state = shiftRows(state);
            state = mixColumns(state);
            assembly {
                tmp := mload(add(keySchedule, add(32, mul(i, 16))))
            }
            for (uint8 j = 0; j < 4 * nb; i++) {
                roundKey[j] = tmp[j];
            }
            state = addRoundKey(state, roundKey);
        }
        state = subBytes(state);
        state = shiftRows(state);
        assembly {
            tmp := mload(add(keySchedule, add(32, mul(nr, 16))))
        }
        for (uint8 i = 0; i < 4 * nb; i++) {
            roundKey[i] = tmp[i];
        }
        state = addRoundKey(state, roundKey);
        return state;
    }

    function decrypt1(bytes memory cipherText, bytes memory cipherKey) public view isInitialized returns (bytes memory plainText) {
        uint8 nr = nR;
        uint8 nk = nK;
        uint8 nb = nB;
        require(cipherText.length == 4 * nb && cipherKey.length == 4 * nk, "Incorrect data");
        bytes memory keySchedule = keyExpansion(cipherKey);
        bytes16 tmp;
        assembly {
            tmp := mload(add(keySchedule, add(32, mul(nr, 16))))
        }
        bytes memory roundKey = new bytes(4 * nb);
        bytes memory state = new bytes(4 * nb);
        for (uint8 i = 0; i < 4 * nb; i++) {
            roundKey[i] = tmp[i];
            state[i] = cipherText[i];
        }
        state = addRoundKey(state, roundKey);
        for (uint8 i = nr - 1; i >= 1; i--) {
            state = invShiftRows(state);
            state = invSubBytes(state);
            assembly {
                tmp := mload(add(keySchedule, add(32, mul(i, 16))))
            }
            for (uint8 j = 0; j < 4 * nb; i++) {
                roundKey[j] = tmp[j];
            }
            state = addRoundKey(state, roundKey);
            state = invMixColumns(state);
        }
        state = invShiftRows(state);
        state = invSubBytes(state);
        assembly {
            tmp := mload(add(keySchedule, 32))
        }
        for (uint8 i = 0; i < 4 * nb; i++) {
            roundKey[i] = tmp[i];
        }
        state = addRoundKey(state, roundKey);
        return state;
    }

    function keyExpansion(bytes memory cipherKey) public view returns (bytes memory keySchedule) {
        uint8 nr = nR;
        uint8 nk = nK;
        uint8 nb = nB;
        require(cipherKey.length == 4 * nk, "Incorrect data");
        keySchedule = new bytes(4 * nb * (nr + 1));
        for (uint8 i = 0; i < cipherKey.length; i++) {
            keySchedule[i] = cipherKey[i];
        }
        for (uint8 i = nk; i < nb * (nr + 1); i++) {
            if (i % nk == 0) {
                bytes memory firstTerm = new bytes(4);
                bytes memory secondTerm = new bytes(4);
                for (uint j = 0; j < 4; j++) {
                    firstTerm[j] = keySchedule[i * 4 - 4 * nk + j];
                    secondTerm[j] = getByteFromSbox(keySchedule[i * 4 - 4 * nk + (j + 1) % 4]);
                }
                keySchedule[i * 4] = firstTerm[0] ^ secondTerm[0] ^ rcon[i / nk - 1];
                keySchedule[i * 4 + 1] = firstTerm[1] ^ secondTerm[1] ^ 0x00;
                keySchedule[i * 4 + 2] = firstTerm[2] ^ secondTerm[2] ^ 0x00;
                keySchedule[i * 4 + 3] = firstTerm[3] ^ secondTerm[3] ^ 0x00;
            } else {
                keySchedule[i * 4] = getByteFromSbox(keySchedule[i * 4 - 4 * nk]) ^ keySchedule[(i - 1) * 4];
                keySchedule[i * 4 + 1] = getByteFromSbox(keySchedule[i * 4 - 4 * nk + 1]) ^ keySchedule[(i - 1) * 4 + 1];
                keySchedule[i * 4 + 2] = getByteFromSbox(keySchedule[i * 4 - 4 * nk + 2]) ^ keySchedule[(i - 1) * 4 + 2];
                keySchedule[i * 4 + 3] = getByteFromSbox(keySchedule[i * 4 - 4 * nk + 3]) ^ keySchedule[(i - 1) * 4 + 3];
            }
        }
    }

    function addRoundKey(bytes memory input, bytes memory roundKey) public view returns (bytes memory) {
        uint8 nb = nB;
        require(input.length == 4 * nb && roundKey.length == 4 * nb, "Incorrect data");
        for (uint8 i = 0; i < 4; i++) {
            for (uint8 j = 0; j < nb; j++) {
                input[i * nb + j] = input[i * nb + j] ^ roundKey[i * nb + j];
            }
        }
        return input;
    }

    function subBytes(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint8 i = 0; i < 4 * nb; i++) {
            output[i] = getByteFromSbox(input[i]);
        }
    }

    function invSubBytes(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint8 i = 0; i < 4 * nb; i++) {
            output[i] = getByteFromInvSbox(input[i]);
        }
    }

    function shiftRows(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint i = 0; i < nb; i++) {
            for (uint j = 0; j < nb; j++) {
                uint num = (nb + j - i) % 4;
                output[i * nb + num] = input[i * nb + j];
            }
        }
    }

    function invShiftRows(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint i = 0; i < nb; i++) {
            for (uint j = 0; j < nb; j++) {
                uint num = (nb + j + i) % 4;
                output[i * nb + num] = input[i * nb + j];
            }
        }
    }

    function mixColumns(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint i = 0; i < nb; i++) {
            output[i] = mulBy02(input[i])^mulBy03(input[nb + i])^input[2 * nb + i]^input[3 * nb + i];
            output[nb + i] = input[i]^mulBy02(input[nb + i])^mulBy03(input[2 * nb + i])^input[3 * nb + i];
            output[2 * nb + i] = input[i]^input[nb + i]^mulBy02(input[2 * nb + i])^mulBy03(input[3 * nb + i]);
            output[3 * nb + i] = mulBy03(input[i])^input[nb + i]^input[2 * nb + i]^mulBy02(input[3 * nb + i]);
        }
    }

    function invMixColumns(bytes memory input) public view returns (bytes memory output) {
        uint8 nb = nB;
        require(input.length == 4 * nb, "Incorrect data");
        output = new bytes(4 * nb);
        for (uint i = 0; i < nb; i++) {
            output[i] = mulBy0e(input[i])^mulBy0b(input[nb + i])^mulBy0d(input[2 * nb + i])^mulBy09(input[3 * nb + i]);
            output[nb + i] = mulBy09(input[i])^mulBy0e(input[nb + i])^mulBy0b(input[2 * nb + i])^mulBy0d(input[3 * nb + i]);
            output[2 * nb + i] = mulBy0d(input[i])^mulBy09(input[nb + i])^mulBy0e(input[2 * nb + i])^mulBy0b(input[3 * nb + i]);
            output[3 * nb + i] = mulBy0b(input[i])^mulBy0d(input[nb + i])^mulBy09(input[2 * nb + i])^mulBy0e(input[3 * nb + i]);
        }
    }

    function getByteFromSbox(bytes1 input) internal view returns (bytes1) {
        uint8 numberFromInput = uint8(input);
        return sbox.lines[numberFromInput / 32][numberFromInput % 32];
    }

    function getByteFromInvSbox(bytes1 input) internal view returns (bytes1) {
        uint8 numberFromInput = uint8(input);
        return invSbox.lines[numberFromInput / 32][numberFromInput % 32];
    }

    function mulBy02(bytes1 input) internal pure returns (bytes1) {
        bytes2 output;
        if (input < 0x80) {
            output = (input<<1);
        } else {
            output = (input<<1)^0x1b;
        }
        output = bytes1(uint8(uint16(output) % 256));
    }

    function mulBy03(bytes1 input) internal pure returns (bytes1) {
        return mulBy02(input)^input;
    }

    function mulBy09(bytes1 input) internal pure returns (bytes1) {
        return mulBy02(mulBy02(mulBy02(input)))^input;
    }

    function mulBy0b(bytes1 input) internal pure returns (bytes1) {
        return mulBy02(mulBy02(mulBy02(input)))^mulBy02(input)^input;
    }

    function mulBy0d(bytes1 input) internal pure returns (bytes1) {
        return mulBy02(mulBy02(mulBy02(input)))^mulBy02(mulBy02(input))^input;
    }

    function mulBy0e(bytes1 input) internal pure returns (bytes1) {
        return mulBy02(mulBy02(mulBy02(input)))^mulBy02(mulBy02(input))^mulBy02(input);
    }
}