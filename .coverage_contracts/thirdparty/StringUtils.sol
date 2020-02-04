/*
    StringUtils.sol - SKALE Manager
    Copyright (C) 2018-Present SKALE Labs
    @author Vadim Yavorsky

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

pragma solidity ^0.5.3;


contract StringUtils {
function coverage_0x717ef7ea(bytes32 c__0x717ef7ea) public pure {}


    function strConcat(string calldata _a, string calldata _b) external pure returns (string memory) {coverage_0x717ef7ea(0x6460252c89708a6a218a5c3ed021058f16f0ccaa021e36cb418af1ad24a9279c); /* function */ 

coverage_0x717ef7ea(0x261377c687d1c5e6edec5d125becf688521a9bbe606b3b1ee03e88a6468c0da0); /* line */ 
        coverage_0x717ef7ea(0x7f07122b5432c7e3ecda2c116609525a0d208892acdb891448caaeaf522b1c04); /* statement */ 
bytes memory _ba = bytes(_a);
coverage_0x717ef7ea(0x98603e837da1a50a151d411f25be62af0ee114ce26d138e6919ea4f587d18813); /* line */ 
        coverage_0x717ef7ea(0x5682586c3762c191509fa739010186ff71e0691f50c34607144f53295317cf76); /* statement */ 
bytes memory _bb = bytes(_b);

coverage_0x717ef7ea(0xa420e1c96761d753f41ed5d62d0c6efd9b89ba6f15dfcaf904c33d96be042128); /* line */ 
        coverage_0x717ef7ea(0x58707802a736f71746a6523f2b951fb48f07fe3a95875627c1d8de68f46a83f9); /* statement */ 
string memory ab = new string(_ba.length + _bb.length);
coverage_0x717ef7ea(0x61422d1d44a7e634070364cb00ac543c79f779697fa28a95e726d04ca780f377); /* line */ 
        coverage_0x717ef7ea(0xa08544aab169e3e2f2a38cce161c4cdf1c4dcb4d95422ac5b652340e6c847cea); /* statement */ 
bytes memory strBytes = bytes(ab);
coverage_0x717ef7ea(0x034827c893dca55acfe104a7ea288d08ecb2b91b2b0ed5a5317f9c5d897dcaa6); /* line */ 
        coverage_0x717ef7ea(0x8394a9a078c45a27513c644896688dee67ddab76bed66e99e5c432e287dfd2d9); /* statement */ 
uint k = 0;
coverage_0x717ef7ea(0x9cddfa741e71c871546980bb36b8fc2d2222e3a8c597a067357cbc650e89e8a7); /* line */ 
        coverage_0x717ef7ea(0x869171d11efee247d418d0a0ba396b893daac39be02aced97242c11d98cecd1a); /* statement */ 
uint i = 0;
coverage_0x717ef7ea(0x0f88384d79323b3c1fed304fe3b97a4d4d519d180d500f59ad75fde7d5994336); /* line */ 
        coverage_0x717ef7ea(0x91702cd001866234ba4af13e4ff8285d0855cacd047655027b2875d9fc5d89ff); /* statement */ 
for (i = 0; i < _ba.length; i++) {
coverage_0x717ef7ea(0xa3fae5d872d781fe1c6a2a627cecb77785274a1415375cbbc71ea2055970c575); /* line */ 
            coverage_0x717ef7ea(0xccab46cf011d0bc75afb7a599563793f5f57a37d14b371c60846a248346d580e); /* statement */ 
strBytes[k++] = _ba[i];
        }
coverage_0x717ef7ea(0xa5b468cc2a279d2dd3ff4dec48c32c91474446a70a36e0c8bd24969cc8fad45d); /* line */ 
        coverage_0x717ef7ea(0xa7725b30d944182794c8e471284ec0b274e91642c958d85a71bfdb76baf8bc93); /* statement */ 
for (i = 0; i < _bb.length; i++) {
coverage_0x717ef7ea(0x953fb786fd5ee44b90f4c25274b856c69d07915f80c442ec899a969136f230b7); /* line */ 
            coverage_0x717ef7ea(0x74a26f1ba229a3b343008a0716e83ec3b7d3df4b2478af31cfd21b734dd81079); /* statement */ 
strBytes[k++] = _bb[i];
        }
coverage_0x717ef7ea(0xa781b09c80ab4484173668e49759815bbea29cb8b93f5eaa9998f7723e030ab8); /* line */ 
        coverage_0x717ef7ea(0xe8652e7d82c8824f268845e6b3c25df2fc0abc66e4c43c6bcd65f6df07dc5158); /* statement */ 
return string(strBytes);
    }

    function uint2str(uint _i) external pure returns (string memory) {coverage_0x717ef7ea(0x37b4736b43c4f9045104eea0e43e8a6e9b012c530d94c4b77313572fb9ab0935); /* function */ 

coverage_0x717ef7ea(0x433ad363367ec530b2b7a40045ec34dd456e5d8e1f31f8fc5aa00c4ea295fce8); /* line */ 
        coverage_0x717ef7ea(0x463663825e32697272dd50d7d6a1b226751db979a8371cbb03b0885f35fa2fb0); /* statement */ 
if (_i == 0) {coverage_0x717ef7ea(0xf028e96be12889e1b58412778ce46a3419b2b5f8efca0af2d73ccda84baec937); /* branch */ 

coverage_0x717ef7ea(0xc37dbef0f3d5aa6ed4091550bbd123738ff2fe95c5efd7100a93939db254f84b); /* line */ 
            coverage_0x717ef7ea(0x092350609293770aa3d7c22d0f3abe743a4b94c10d0f43fa08ee23eb5717ea48); /* statement */ 
return "0";
        }else { coverage_0x717ef7ea(0x86222a51bf4b459bf4469de7ec6b70815dd9282e5f1b013dab4a8b96c0fb84d4); /* branch */ 
}
coverage_0x717ef7ea(0xe065e64e436dd87c1bd872209a09976eea5ae9d086db2037ce4dc26f49a772dc); /* line */ 
        coverage_0x717ef7ea(0x06ac542f40c17a43d962090311fac7b26543ad6c097b6bd5fad7d506cdbc0848); /* statement */ 
uint j = _i;
coverage_0x717ef7ea(0xf6e7c541e9853c75afee898309c3e759bfdc3842621314d1e3946bbc03daca67); /* line */ 
        coverage_0x717ef7ea(0x5066a6c8f912b3d9a5e40672070c2bc8e8b8f3117c13e724f837ba6a11ab83e1); /* statement */ 
uint i = _i;
coverage_0x717ef7ea(0x401512bc7dc92e76f5f34e179f39b90e4c6c0ca4fa2f2b40847706fd41fef7ac); /* line */ 
        coverage_0x717ef7ea(0x1686e8f1c88aec803b3a1f248a6cf7edcb478e31dbd6cad238c41f1449a35c70); /* statement */ 
uint len;
coverage_0x717ef7ea(0xe16f1d932e5039dcd34d16f713d7120ad5761f2e6b260390aba4318abe576e3e); /* line */ 
        coverage_0x717ef7ea(0xe9d18e86675baea8c8e46a20bc64aeb56585907ff772fa3a6027cb03c0606db8); /* statement */ 
while (j != 0) {
coverage_0x717ef7ea(0x5889f9c43c965d978d05290f6100edb0bf20a344400a198614d3b13ef05853a6); /* line */ 
            len++;
coverage_0x717ef7ea(0xb40f053bbdbae9e0e8aadc6ed6dd019fe475371fe4ae09070fd8b7a0f2504c22); /* line */ 
            coverage_0x717ef7ea(0xf22f399ac8a91895680f593a63a5fd3f07ee0b5c162733f502a7217615186aec); /* statement */ 
j /= 10;
        }
coverage_0x717ef7ea(0xda0b727347c988d77bf7b2ffb97ee2d9bbcc73aaed37f23512c99bfbbcc2ee19); /* line */ 
        coverage_0x717ef7ea(0x747752e4d0779d18d0ef85a2a3e3c7b508911a260982a608badb6526a3ac6e77); /* statement */ 
bytes memory bstr = new bytes(len);
coverage_0x717ef7ea(0xe6caa624401d649cdc768951c81980c3609196b724f00931a9dc5171a5e7887f); /* line */ 
        coverage_0x717ef7ea(0x72ece384381efbf5c3bdd4f7628c065e16aa8c571f91e180d2b4cff413324ee5); /* statement */ 
uint k = len - 1;
coverage_0x717ef7ea(0xe1bb6e252a3c711e39515a23ab237700bcff841dbdce6abc8223346f541e2df0); /* line */ 
        coverage_0x717ef7ea(0x6796d9d7e5a547919c6b4ea981498304baebef29a7ac687b81106b9c334d6a9b); /* statement */ 
while (i != 0) {
coverage_0x717ef7ea(0xc21bdee9cfee290e06d6e6fdb79400e106ed3c5a9fbdfb1b2da2aeecbc03c5f9); /* line */ 
            coverage_0x717ef7ea(0xd181fdf7e7765e94735d90274d731e744c1a38d015d67dd45f827a17ace1b277); /* statement */ 
bstr[k--] = byte(uint8(48 + i % 10));
coverage_0x717ef7ea(0x1e746c0ccf313d073dc707bb0323486817cc2c03617b6c7b1cd4ed86bbc87ac0); /* line */ 
            coverage_0x717ef7ea(0x1ee45de227ac697f2cf57bc1a9cfa947c72e5c196b13e3768e6a385fe7ca4b3b); /* statement */ 
i /= 10;
        }
coverage_0x717ef7ea(0x09f5ae3adeabae27c353ea089f506938d92c52ab6ee872dfbf3b5480a4f2b489); /* line */ 
        coverage_0x717ef7ea(0xf62e37837f44c75d9994fb934c6f1ac4cce785f92643a7469f8a0e523ac7b10e); /* statement */ 
return string(bstr);
    }

}