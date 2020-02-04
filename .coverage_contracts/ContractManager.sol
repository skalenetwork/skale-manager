/*
    ContractManager.sol - SKALE Manager
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

import "./Ownable.sol";
import "./thirdparty/StringUtils.sol";


/**
 * @title Main contract in upgradeable approach. This contract contain actual
 * contracts for this moment in skale manager system by human name.
 * @author Artem Payvin
 */
contract ContractManager is Ownable {
function coverage_0xff601327(bytes32 c__0xff601327) public pure {}


    // mapping of actual smart contracts addresses
    mapping (bytes32 => address) public contracts;

    event ContractUpgraded(string contractsName, address contractsAddress);

    /**
     * Adds actual contract to mapping of actual contract addresses
     * @param contractsName - contracts name in skale manager system
     * @param newContractsAddress - contracts address in skale manager system
     */
    function setContractsAddress(string calldata contractsName, address newContractsAddress) external onlyOwner {coverage_0xff601327(0x07fcdfb3f5b7f0d6e5b785c73c9264d34a46d2b456cc4a4e73fca045fb2c8cb2); /* function */ 

        // check newContractsAddress is not equal zero
coverage_0xff601327(0xd38a7adb77ebefc2fc503a206aaafe9ccb3262cc8cdfd3177edc939744014d8c); /* line */ 
        coverage_0xff601327(0x7c6db695502a048083d2a42f414a0334f460d54ade357de02e41ae872b7229f6); /* assertPre */ 
coverage_0xff601327(0xe59c6cf0d700dced58e51ed2f279f51241e0091e36c565472213d124aca00bb6); /* statement */ 
require(newContractsAddress != address(0), "New address is equal zero");coverage_0xff601327(0x8a1e2d5da6c75d7fd3321eec633c07ce669c327ef53cfd52f97723410a76254e); /* assertPost */ 

        // create hash of contractsName
coverage_0xff601327(0x92818087fc2ed2899668cd3d13b31313a39191cc9637dcb506a09ae90aa03e00); /* line */ 
        coverage_0xff601327(0xd7ea3113ebec253a66183f6d9dbc3201e40a973bc1ad1e3f34a1de34d28cc3b3); /* statement */ 
bytes32 contractId = keccak256(abi.encodePacked(contractsName));
        // check newContractsAddress is not equal the previous contract's address
coverage_0xff601327(0x79a3eb6cdcbfae9be3b2a167a9f04ef440cd07c80311112098dbb0224059052e); /* line */ 
        coverage_0xff601327(0xe8b121957deb44cf0d3e208d488960dcb77354e0606298381bb83e75832e375b); /* assertPre */ 
coverage_0xff601327(0xf52d1c62354a61c2549b5b4eba9fc01de92ae8b8fca4d537c44e34fbe5f024da); /* statement */ 
require(contracts[contractId] != newContractsAddress, "Contract is already added");coverage_0xff601327(0x5dd916b83ea363d29b1769fa698b9eb8f99a07ed649e8e99f5df068d24933ff2); /* assertPost */ 

coverage_0xff601327(0xfed0559fe10445371c3d9e30ba3addaea2290ffb4a94d5834f792907710a1543); /* line */ 
        coverage_0xff601327(0xc2805515c5a6deb9b98b056c4085129031f99ecd176685a78fd5b0bba6761c01); /* statement */ 
uint length;
coverage_0xff601327(0x85fc52be6a26e414c5a33620459589265df80a977056e1de13b23e5a55a4e654); /* line */ 
        assembly {
            length := extcodesize(newContractsAddress)
        }
        // check newContractsAddress contains code
coverage_0xff601327(0x00bff2426740211f924545a446eb2c580c56ac3f02de4cf6cef55a63f1861ca2); /* line */ 
        coverage_0xff601327(0x168a008eb32cfb1218af0b47c9771f86dcd2415de5772460cb118080d4b2f7db); /* assertPre */ 
coverage_0xff601327(0xc089dc77dce02abec984134aa6e326a6b21b772ee6cd5715c3c0ab2d4f22c329); /* statement */ 
require(length > 0, "Given contracts address is not contain code");coverage_0xff601327(0x63efac371e835b6f43324c9017b0ba382be62cf87ca2b0782929a1292e332d07); /* assertPost */ 

        // add newContractsAddress to mapping of actual contract addresses
coverage_0xff601327(0xe8b9555b034bc1e6d145cbf99da5d151cf0894d9ae76776c3df52ccb2d2f57f5); /* line */ 
        coverage_0xff601327(0x838519885969cda2cd4ceb3a699cdf43db1b11d3c77a604e8b3b5b80ca27268f); /* statement */ 
contracts[contractId] = newContractsAddress;
coverage_0xff601327(0xd07c2a542abd44332e85fb680533056cd6de5a19f931f2cad7d47da2dd0f0c4e); /* line */ 
        coverage_0xff601327(0xbd8f44a70e367bb96993447b83eeff6d2ae2ddf9636328ec72168cc85b7a1bc9); /* statement */ 
emit ContractUpgraded(contractsName, newContractsAddress);
    }

    function getContract(string calldata name) external view returns (address contractAddress) {coverage_0xff601327(0x947edd93699aa8390290be43f615ed6121c9fc9224bca4afd760dc7ad820e8df); /* function */ 

coverage_0xff601327(0x4558aab27b72abd8df306bf80f274aa20a88c438eb5ef92ea648885ba78c3825); /* line */ 
        coverage_0xff601327(0x86dd41de33de083e0dea76bdfd6f7f329d272fc6e81e0573aa6f5739770966b6); /* statement */ 
StringUtils stringUtils = StringUtils(contracts[keccak256(abi.encodePacked("StringUtils"))]);
coverage_0xff601327(0xf651de7c171768ad65cd2975b0816cbfe9c0f1927ac2ab726f9958075160363e); /* line */ 
        coverage_0xff601327(0x22e1c9837755597b69f7730e6a8ead671b05644e5573cb6e7550d396058270fa); /* statement */ 
contractAddress = contracts[keccak256(abi.encodePacked(name))];
coverage_0xff601327(0x76fb9484291874cd0a1242b01b2e2bf70fd11d40ce69d83cf7af8003373f8923); /* line */ 
        coverage_0xff601327(0xd41f4ed66967844dd7fdc79e7e8dc52abddf0b0ed605379a631367f90cc60563); /* assertPre */ 
coverage_0xff601327(0xa5d5ec558ecdd7080d01efb08819727c3a7aa802ac9264e1c9ee02f1454201d8); /* statement */ 
require(contractAddress != address(0), stringUtils.strConcat(name," contract has not been found"));coverage_0xff601327(0x74512475d8d4d3c4f4c55b12248b168e5db1cba169a8d63819e4f6a8bd187ee9); /* assertPost */ 

    }
}
