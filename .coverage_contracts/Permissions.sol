/*
    Permissions.sol - SKALE Manager
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

import "./ContractManager.sol";


/**
 * @title Permissions - connected module for Upgradeable approach, knows ContractManager
 * @author Artem Payvin
 */
contract Permissions is Ownable {
function coverage_0x575eb1ae(bytes32 c__0x575eb1ae) public pure {}


    ContractManager contractManager;

    /**
     * @dev allow - throws if called by any account and contract other than the owner
     * or `contractName` contract
     * @param contractName - human readable name of contract
     */
    modifier allow(string memory contractName) {coverage_0x575eb1ae(0x94544d3d67a31c4fa5173af580161070cdb96ba7f82a4cd1b21263a741f4b91c); /* function */ 

coverage_0x575eb1ae(0x303d23d1ab1a0df4a7af23bf634f52cad20ff0a93dabc501fa8b89c7f3cf9ccc); /* line */ 
        coverage_0x575eb1ae(0xe99fd8f3d03576a27d6a8661fc4213e5c23c95ee2b8273178ca0ec2944c8c449); /* assertPre */ 
coverage_0x575eb1ae(0x87546008aa167d550e2c30f51363816b611feda442229b25bb840d0c08f7fd37); /* statement */ 
require(
            contractManager.contracts(keccak256(abi.encodePacked(contractName))) == msg.sender || owner == msg.sender,
            "Message sender is invalid");coverage_0x575eb1ae(0xa120f84de4b150c755df48d064bbd82ebf06f7c5f4ae4e4c3a9e71292f85d64c); /* assertPost */ 

coverage_0x575eb1ae(0x5c536ba382a53e26b3821446bc6940a5a5a8253cca68d0884b7da12ea2e8cb2d); /* line */ 
        _;
    }

    modifier allowTwo(string memory contractName1, string memory contractName2) {coverage_0x575eb1ae(0xc8ca6eb89513eff1a6b1dbf58d50058070c61e9f616c78e5838176cc081cfce1); /* function */ 

coverage_0x575eb1ae(0x2cd119ff981633ac8a95bd081b1d81ef2ab4c1db4437d1e75a77b05ae85834c8); /* line */ 
        coverage_0x575eb1ae(0x72328db7fe213775d2576a62c8a1cecfabc959db909190ea9bee165037992b0a); /* assertPre */ 
coverage_0x575eb1ae(0x419951e9b15fb890c0390b03218d676befc23e8e310a36d479e2784910c4aac9); /* statement */ 
require(
            contractManager.contracts(keccak256(abi.encodePacked(contractName1))) == msg.sender ||
            contractManager.contracts(keccak256(abi.encodePacked(contractName2))) == msg.sender ||
            owner == msg.sender,
            "Message sender is invalid");coverage_0x575eb1ae(0xf34b43fc5347b4b710cd2f68568fa8c83db884c866c30d4ad4c156e8a823d235); /* assertPost */ 

coverage_0x575eb1ae(0x949497029aeaae63846dc73eaa9660e3b1e5ef647cfb00f885945dbc678c3dd0); /* line */ 
        _;
    }

    modifier allowThree(string memory contractName1, string memory contractName2, string memory contractName3) {coverage_0x575eb1ae(0x6c120ef45415d63e3b122d0c9aa050f1fbe2bbcbbf29d88a39116204443ec4de); /* function */ 

coverage_0x575eb1ae(0x58e591e7f801dfc9fc9bca32fd50de03d7033de4939fdfe4fa3c4a3342e31131); /* line */ 
        coverage_0x575eb1ae(0xad41930561c5773f823b71f065ed52efaffd378ebdcf83a2d95b2b08b4c35c45); /* assertPre */ 
coverage_0x575eb1ae(0x531c86eee9833b8813d783b46393b82631e1245eec5a180b9511af310d6e4fec); /* statement */ 
require(
            contractManager.contracts(keccak256(abi.encodePacked(contractName1))) == msg.sender ||
            contractManager.contracts(keccak256(abi.encodePacked(contractName2))) == msg.sender ||
            contractManager.contracts(keccak256(abi.encodePacked(contractName3))) == msg.sender ||
            owner == msg.sender,
            "Message sender is invalid");coverage_0x575eb1ae(0xa0168669ec0d2e74ecacc3dbdb82c22b4fb84ddc7d5a100734220add2368082e); /* assertPost */ 

coverage_0x575eb1ae(0xfd0ea93f037b54d419980b6810bed347e44efab7a8efa26fb63adba08355168a); /* line */ 
        _;
    }

    /**
     * @dev constructor - sets current address of ContractManager
     * @param newContractsAddress - current address of ContractManager
     */
    constructor(address newContractsAddress) public {coverage_0x575eb1ae(0xad3e910b3876a583dbb9cd0bd8da944a5cde15f6cd1fe4803921607e7575ed6e); /* function */ 

coverage_0x575eb1ae(0x00be9e0cb6d77bfa05963a71cffbc6cc599e01740535fc81e61fd6b46a13c2a2); /* line */ 
        coverage_0x575eb1ae(0xd61d29bfedd41c7e6d9b60be2bfb74ffeefcfcff5b7e279ff3d6964e513f6823); /* statement */ 
contractManager = ContractManager(newContractsAddress);
    }
}
