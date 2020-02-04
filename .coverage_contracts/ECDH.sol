/*
    ECDH.sol - SKALE Manager
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


contract ECDH {
function coverage_0x54a16165(bytes32 c__0x54a16165) public pure {}


    uint256 constant GX = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
    uint256 constant GY = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
    uint256 constant N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
    uint256 constant A = 0;
    // uint256 constant B = 7;

    constructor () public {coverage_0x54a16165(0xec1216faaa14c670b8bf296d993a247d134976ceda78e9450ca6de58e3a83593); /* function */ 


    }

    function publicKey(uint256 privKey) external pure returns (uint256 qx, uint256 qy) {coverage_0x54a16165(0xb340f97d423853140472a2d584d055a430e7321bb3c48be4e9793f7746ec8041); /* function */ 

coverage_0x54a16165(0xef92ea3e8a37beb84189561cf53128a956a639e76ed863326ed5a756888bfbda); /* line */ 
        coverage_0x54a16165(0xb2acdab7d9ad2f54ab546327e566af09569948013663c3b50fa1f8c4384c93e5); /* statement */ 
uint256 x;
coverage_0x54a16165(0x24a4073058bf0801fb74ba576c7c9b095b4eea43c03a313259d675e4bc935034); /* line */ 
        coverage_0x54a16165(0x136e3220b6a752d8ed76034148885743f7546687d8aaf303a45ee55911473fed); /* statement */ 
uint256 y;
coverage_0x54a16165(0x8a8665f35a5ed2a4d6f7b374a9fd6b70314fc913cb3117bf404abd26e1f81ea4); /* line */ 
        coverage_0x54a16165(0xba08d91cc77762fbac5bdb622983fcfc902cb7dd515a0003307fa72916376c18); /* statement */ 
uint256 z;
coverage_0x54a16165(0x16d631cd93c76bd546ab916dbc16cb2116736df684af3b1a1d41970e63b001d5); /* line */ 
        coverage_0x54a16165(0x7e2a033575aafcf595555d691517a2c5bdcd43c276aaf3f5ab399425cedcc9aa); /* statement */ 
(x, y, z) = ecMul(
            privKey,
            GX,
            GY,
            1
        );
coverage_0x54a16165(0x36dc1d5f31ff01b4ae7fdc297dcca78b91d3b96d7dad003b5f7d86a9a6e21824); /* line */ 
        coverage_0x54a16165(0xc0364dd3b06b9d1bb790c7bc6cbf93d95985e3340f304a50fb8db5a5214b96da); /* statement */ 
z = inverse(z);
coverage_0x54a16165(0x7ad2afe3682ec9f5cd1b65c209bcb8b123238fef0dff4ca82f18caa93516f7bb); /* line */ 
        coverage_0x54a16165(0xf5f0f1b43bcad8aaccb1c29855e00b17c3eb62bd45da0d9418000c7f2214d05e); /* statement */ 
qx = mulmod(x, z, N);
coverage_0x54a16165(0xb06e44a150c5c9778052ad7d5c8666266c86a48cfad4311a3917f00fdf3d957a); /* line */ 
        coverage_0x54a16165(0x2b13cfa87c31444a75ca8d028ec45fdaeb16286177eae00ad87dfc042d7fdf7b); /* statement */ 
qy = mulmod(y, z, N);
    }

    function deriveKey(
        uint256 privKey,
        uint256 pubX,
        uint256 pubY
    )
        external
        pure
        returns (uint256 qx, uint256 qy)
    {coverage_0x54a16165(0x4229ae7e48220bfed9055c783cb353a91ee28514842361b1a589aa311b781630); /* function */ 

coverage_0x54a16165(0xcdf03f0e9868009485b31c7c92c6babdc6561b1518e95fca8e9f57197ec34628); /* line */ 
        coverage_0x54a16165(0x754fdc9d5d96d2539038ab6dc62f7ea062f360a70f927fce9d82e88e0d3f8de4); /* statement */ 
uint256 x;
coverage_0x54a16165(0xdae43a6ca987f2b8ab431696c167a2361f6c703213143d7e36eb357c28871081); /* line */ 
        coverage_0x54a16165(0x5d91a89a7323332e490add51d9eb336ae43ea8faf3fad802544c99712422d9fb); /* statement */ 
uint256 y;
coverage_0x54a16165(0xfc064364e3a2128cb286126551c75e93e80ca736e4b510171007992676271a86); /* line */ 
        coverage_0x54a16165(0x874488c67d4bb812b29f03c6eff992044fa5af05d7dcd8a23043a020825d80ab); /* statement */ 
uint256 z;
coverage_0x54a16165(0xb9273076eec191b19b3c77aa55ad8272ee20b41cf812298677cc0815f64b32ea); /* line */ 
        coverage_0x54a16165(0xc27c630f2443f3e2b45dfed973e217012d732d19d57c32f185100517a4e7ff00); /* statement */ 
(x, y, z) = ecMul(
            privKey,
            pubX,
            pubY,
            1
        );
coverage_0x54a16165(0x67d3170d2ab8078a7f850cefabcb0999ac47b7785adf3a9bf63dbede12c3edc2); /* line */ 
        coverage_0x54a16165(0x3733f4cac3a7996170b7b66336916ae85b250561c2fe52e6ce7874a6f26367a3); /* statement */ 
z = inverse(z);
coverage_0x54a16165(0x61114918029f75ffa9e717df2bd582dea26ad00cf2454f48412a092bf1456451); /* line */ 
        coverage_0x54a16165(0xeb7cce57ee688f35e7170f9a769bd617abc6d47fd31b2c375f78012185a5ad97); /* statement */ 
qx = mulmod(x, z, N);
coverage_0x54a16165(0xb1dbe9364a1af7a5c0001479052c252b23a529135fbaa1eb5a8ff80eaf7b7141); /* line */ 
        coverage_0x54a16165(0x943d02b4764f74857c6bd5ebd63575cb11cab8b86a3213a624503f7f76490445); /* statement */ 
qy = mulmod(y, z, N);
    }

    function jAdd(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        public
        pure
        returns (uint256 x3, uint256 z3)
    {coverage_0x54a16165(0x3412f2b547d264bb39be5586e99f10633965b600a894c74c7045f2ec20625227); /* function */ 

coverage_0x54a16165(0x47910006206bf5a564775a2c418a9d9caae85b5f6054aa9d4fb5c689cc113936); /* line */ 
        coverage_0x54a16165(0xce45d83005036bb79a20d17325555f5ed25b068ccab2ca5a0bcd127592087d1b); /* statement */ 
(x3, z3) = (addmod(mulmod(z2, x1, N), mulmod(x2, z1, N), N), mulmod(z1, z2, N));
    }

    function jSub(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        public
        pure
        returns (uint256 x3, uint256 z3)
    {coverage_0x54a16165(0xfe9559461399db809abcc183a3fdd10e1958a6ad8b18a6dbc3ccabde25a13f9b); /* function */ 

coverage_0x54a16165(0xd719524f2d852a919d97f5855b470b44db6490ef4ca85205d00650b4ba209667); /* line */ 
        coverage_0x54a16165(0x88de61b38bc2c5033dad5ae96065dbffa62bc8531ef3d87509559117e4b78220); /* statement */ 
(x3, z3) = (addmod(mulmod(z2, x1, N), mulmod(N - x2, z1, N), N), mulmod(z1, z2, N));
    }

    function jMul(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        public
        pure
        returns (uint256 x3, uint256 z3)
    {coverage_0x54a16165(0xe3f3f704d666c2b062af1c02f4d085572333f1953123ff773d8e677546439b95); /* function */ 

coverage_0x54a16165(0xa7d59058df4e39be4891d889ba0abf81b0dedfb788f729d2c6e4022244c6ff88); /* line */ 
        coverage_0x54a16165(0xd4d12a0ca6324932cc25e6141824b9d68d291ec1406473cc0b58ea11c759b83e); /* statement */ 
(x3, z3) = (mulmod(x1, x2, N), mulmod(z1, z2, N));
    }

    function jDiv(
        uint256 x1,
        uint256 z1,
        uint256 x2,
        uint256 z2
    )
        public
        pure
        returns (uint256 x3, uint256 z3)
    {coverage_0x54a16165(0xddac427f1f323b171f5751811455cde7657d2fefb574d1bb14da05f27e01a2d9); /* function */ 

coverage_0x54a16165(0x02b7721db0bb4801e03927682be00be24d40d4b0392b589937fb3c9076ecb36d); /* line */ 
        coverage_0x54a16165(0x45758ad2714d6b06ecd0008c7cb485781db2a78d3423ad19d1e863b20b4c96ab); /* statement */ 
(x3, z3) = (mulmod(x1, z2, N), mulmod(z1, x2, N));
    }

    function inverse(uint256 a) public pure returns (uint256 invA) {coverage_0x54a16165(0xb95a47f309b3ea096de45db3aaf9bcaa53d9f2f0a4b4c75c9d95c9849830f851); /* function */ 

coverage_0x54a16165(0xa2875061a48ef8d65a000fd1f26e3d7bb8261993086a1ea28f289e852ab775d0); /* line */ 
        coverage_0x54a16165(0x8fcd51f552a3b487848245ae2dc836bcd21c5dbc10fab2c70081fddb1d616d10); /* statement */ 
uint256 t = 0;
coverage_0x54a16165(0xdc4b92230e526be8550a904b5f2acee44a34d003f895bcdb2c57f66164fb9f5d); /* line */ 
        coverage_0x54a16165(0x3583f10982d261d405f20d5fd26399ed79f7e262e55e90c81a046f313f2bede8); /* statement */ 
uint256 newT = 1;
coverage_0x54a16165(0x079897d5c46faa456e70e6f193dde93387365379debbab439fc89c970c59ebb0); /* line */ 
        coverage_0x54a16165(0x35fe792a879fa4d647a7524babae31fab6ee32cbb89786f70e13b465e41737bd); /* statement */ 
uint256 r = N;
coverage_0x54a16165(0xc99920ec8888a7640c15d8e863268f4b93bc3645f37a0e6d12087db469cdf3bb); /* line */ 
        coverage_0x54a16165(0x97d7fa9fbf440912524a6501e71a865d53e706fec3692932d9c11b4f10e1aae7); /* statement */ 
uint256 newR = a;
coverage_0x54a16165(0x00688314452f4b57929355d1d8d602d37ba551b1441763491b969e024e1f4779); /* line */ 
        coverage_0x54a16165(0x0a6a31758bf6b2dd464f18b915ee336ba64cf8e6c4787054ab396b590f958413); /* statement */ 
uint256 q;
coverage_0x54a16165(0xb0e96647f743158cfd0468086121a59e36c9038b9c0a8ad1bce74e18a7e97ff4); /* line */ 
        coverage_0x54a16165(0xcfd5c0d73b26c706561f234a8abf1dbfb4eac3b5dc9e1963011f44267b03fe75); /* statement */ 
while (newR != 0) {
coverage_0x54a16165(0x84f55aa3cb197393dc8e93e3fd4c30e516aa609dee3a93da340d3d8177092300); /* line */ 
            coverage_0x54a16165(0x485f03733d342046117dad7a460b30a7ca076bb783bcf4bc515621db37be78b6); /* statement */ 
q = r / newR;
coverage_0x54a16165(0x2201054bc35c5c6fd03b8d7e971ce0a6bd463f346418f50a7f2ab92d563945f7); /* line */ 
            coverage_0x54a16165(0xc2f01e82f4fbfc603ebca1939e65282386f6eb53d88d9868bab6c0e9d6d90e46); /* statement */ 
(t, newT) = (newT, addmod(t, (N - mulmod(q, newT, N)), N));
coverage_0x54a16165(0x005e9f8e54dd5a8d467702fd143de52772c5d95d5e448e65ca1742ad0add7848); /* line */ 
            coverage_0x54a16165(0x6b16a139c7036e53896c4eb9ee8636129dcf2711d52cec3a3634faaec6c341b5); /* statement */ 
(r, newR) = (newR, r - q * newR);
        }
coverage_0x54a16165(0x271173c630669c8eb711954ee724ed88fb7e0d715c2048bc3df36354a4b9b659); /* line */ 
        coverage_0x54a16165(0xca8cadead1c1ed5f6cffa33a5493e1bf68df59dd25cd23d2f8acf3c8bcc66bba); /* statement */ 
return t;
    }

    function ecAdd(
        uint256 x1,
        uint256 y1,
        uint256 z1,
        uint256 x2,
        uint256 y2,
        uint256 z2
    )
        public
        pure
        returns (uint256 x3, uint256 y3, uint256 z3)
    {coverage_0x54a16165(0xe553e2228255cbf0a43cd256ffab5ce9f0379b9817b6b08df739fd4f262da364); /* function */ 

coverage_0x54a16165(0x706edd0024636157cab75c87401b572dee9c49b33ce36789c8f53c5bfce79b9d); /* line */ 
        coverage_0x54a16165(0x43e971f3b1c4ee5d0a97f6df4b6208be2e17d8a00d31cfcb4efd486d64724702); /* statement */ 
uint256 ln;
coverage_0x54a16165(0x96cea72082568f5d407c099d68a779a8ac76e596fb85b778e6b5eea1d5f1a24d); /* line */ 
        coverage_0x54a16165(0x0ee3928d26e3ea2faa65e49165e661f16b4e15d07a9d08eb085a660885cb0992); /* statement */ 
uint256 lz;
coverage_0x54a16165(0xcb8d6001b8069772fc6b7bdb3f89d7b5aaec67a877b4ffedb02dcd90aea63bfd); /* line */ 
        coverage_0x54a16165(0xd083ef641b43d67b0fc7c2f0adc0912d8ce81b63f7d054b4dee64e8feddef29a); /* statement */ 
uint256 da;
coverage_0x54a16165(0xb59442455d8b3cb51233b5d5b1b6a06ffef0bc71e621bd78848ba8d3ad722a5a); /* line */ 
        coverage_0x54a16165(0xfbd485f6e0fc9d87571ba1147df376c8fb212b5c6097833a91c3caea4cc1b998); /* statement */ 
uint256 db;

coverage_0x54a16165(0x54cc9cf11de9f6941b8a59034a09c2bf3c7a476785597cc6b35df2a83025f3b8); /* line */ 
        coverage_0x54a16165(0x35fb1ec7e3e5625f0e7594b4709b9c57682c149f02ba7947f0ab665aa97df29d); /* statement */ 
if ((x1 == 0) && (y1 == 0)) {coverage_0x54a16165(0xeff9f99f1b56945015470e47662d69418bee4d7b12c6ca18bd27c5758e1b6645); /* branch */ 

coverage_0x54a16165(0x7ee0be7954deaf66cf8bafd13fa816c9e429b14bf6395f8a7b3cc94958d60845); /* line */ 
            coverage_0x54a16165(0x1cb3a9424271d44ab2f2edc6f39a0b103a5d8756c4eaff3919cb6ca7bc49a57e); /* statement */ 
return (x2, y2, z2);
        }else { coverage_0x54a16165(0x3a6df41d95c9cabfdb8d81045775e9ba29c76046096c79dc4b475645bec4ceaa); /* branch */ 
}

coverage_0x54a16165(0xaa2cff910b0ec9784ae9eae6724a8ba8aaad76de6a943e04cb3d6cee0f5779f3); /* line */ 
        coverage_0x54a16165(0x7b99f037f1d0161114ea9893645f001d6448e7f8e8e633373abea03cc6613916); /* statement */ 
if ((x2 == 0) && (y2 == 0)) {coverage_0x54a16165(0xd386aeb20d48b38210d19fd936fdc813bbd047eeb7600aff3b8e986be72ea7ec); /* branch */ 

coverage_0x54a16165(0xc5590e31417a67f7077db6624f2ee01d8d01684b6a95b2e9ee613705cc2b4953); /* line */ 
            coverage_0x54a16165(0xed2be58d2c6172e8197e8b7b9f1247ab0f063c2b300f9c5dd3429a48d85b9df9); /* statement */ 
return (x1, y1, z1);
        }else { coverage_0x54a16165(0xf6f605d2b4a5d50b651a78f86ae00ac7a1b5cda451ccf7d99600bd34b09bc6bb); /* branch */ 
}

coverage_0x54a16165(0x559164c0b40bbab59d5d1779d0680d2d705fcf14752cb84c0bd3adc8304dd2ec); /* line */ 
        coverage_0x54a16165(0x3e725ede18ed04bedb87f9feefa3767d95ec3749f5cd269e51da137e4c87de13); /* statement */ 
if ((x1 == x2) && (y1 == y2)) {coverage_0x54a16165(0x0b152c5174bf665e69ffacba30a55f47645554c5d54f70287d9acc35ed2c6970); /* branch */ 

coverage_0x54a16165(0x66752d82bddbcf6c0deeed4060564fbb559bf40531ab9624dee886e537bd08f2); /* line */ 
            coverage_0x54a16165(0x8213ebec0191bf2558b2cdc6670bf7c51e62b9f20100e31a8f8c77f7349d638e); /* statement */ 
(ln, lz) = jMul(
                x1,
                z1,
                x1,
                z1
            );
coverage_0x54a16165(0x3a352cc82d0b1b9d4035ba8eb18df4664349f8b4432bd2d6ab066e2d18bde94e); /* line */ 
            coverage_0x54a16165(0x38f6ca41a9a58b428adc211762246ccc307a8e87d967235aa0100d3b3fb410c5); /* statement */ 
(ln, lz) = jMul(
                ln,
                lz,
                3,
                1
            );
coverage_0x54a16165(0x86d9851bcff44d67248bfe784a58bda4ecd0868488b955fbdc04e5d5d8f8e665); /* line */ 
            coverage_0x54a16165(0x109d64ebc3fa636f45f2db7648667f449531b58bf2251a9b5d066225b443eb1a); /* statement */ 
(ln, lz) = jAdd(
                ln,
                lz,
                A,
                1
            );
coverage_0x54a16165(0x79debb607d5574f56f2736913ddcc9440f221accd28c489ef9f1b21330a8d7ca); /* line */ 
            coverage_0x54a16165(0x494011b9da331ab555aa3aaedef6d8d5c18fbbc3422e8d9271e59abbada82575); /* statement */ 
(da, db) = jMul(
                y1,
                z1,
                2,
                1
            );
        } else {coverage_0x54a16165(0x668e10d26e76b7dffb44c5756456db2a950becc2baf35113dd91f16219a95bf6); /* branch */ 

coverage_0x54a16165(0x90db8b66eea4bcef274b85bc88c34ad4cbfa2539e7238c228b346a5423cb0d46); /* line */ 
            coverage_0x54a16165(0xee90a3bcf3c3f979f239a62834ce11766d46ef9f3dfbef9325448273322fd7bc); /* statement */ 
(ln, lz) = jSub(
                y2,
                z2,
                y1,
                z1
            );
coverage_0x54a16165(0xab96dc188df4e5529fb8deffe760fb3d3dc500c01f29e56ec50845bea27074d7); /* line */ 
            coverage_0x54a16165(0x7dcbdbdb355117f334d68635fe75932f34d81e2f4ca4242413513c6f24541b4d); /* statement */ 
(da, db) = jSub(
                x2,
                z2,
                x1,
                z1
            );
        }
coverage_0x54a16165(0xd304afc2ed81e0fb262aeee72fb27b809fed34c1fe89feb69015adaa5f50e014); /* line */ 
        coverage_0x54a16165(0x2b39a66ddee88df08069f5611e51c3123b5a3fc32467d2633f8ec8771f44bf7a); /* statement */ 
(ln, lz) = jDiv(
            ln,
            lz,
            da,
            db
        );

coverage_0x54a16165(0x6210d49cf3597d135d654bc42662bcf7ecbdace2bb552c4e64cde2001e9eb51d); /* line */ 
        coverage_0x54a16165(0x6892f807895d796a13db67a4112adc82519f54aab5aa5981e9737e4dd1e1145d); /* statement */ 
(x3, da) = jMul(
            ln,
            lz,
            ln,
            lz
        );
coverage_0x54a16165(0x2fbf1f2e88b21c7a31c8691c57dab9eb3074ed52c0f1165d56a55801b6d5f386); /* line */ 
        coverage_0x54a16165(0xeb8b8227715ab8e5aa51097d4df6a4b370204f06ceff192d620e43302238e78e); /* statement */ 
(x3, da) = jSub(
            x3,
            da,
            x1,
            z1
        );
coverage_0x54a16165(0x685635c461b39dc723e22c26dbce3ba93b9a61ad71f2de317824ddd1ed7b80f8); /* line */ 
        coverage_0x54a16165(0x0d65e6c85703d4c207cf33cbb1be23effc4b679d75d114643108bfd0991a754e); /* statement */ 
(x3, da) = jSub(
            x3,
            da,
            x2,
            z2
        );

coverage_0x54a16165(0x95ee6f7a48678be1dc75d7a456ea7472411f83256089a5a7f85c8bc3474b9bfd); /* line */ 
        coverage_0x54a16165(0xda0142e87aa57087161a3ccc0bc3a5a4313c55eac866c01b5ef47db323da264c); /* statement */ 
(y3, db) = jSub(
            x1,
            z1,
            x3,
            da
        );
coverage_0x54a16165(0xf973fee3a625c8c92a21289282d4f6c8dc8414607c36fea74f3531791bc5bdbe); /* line */ 
        coverage_0x54a16165(0x93a0711aab85b7c667efa7d08d32e0a2f6c9f8e739bb438563eaf7f489f93933); /* statement */ 
(y3, db) = jMul(
            y3,
            db,
            ln,
            lz
        );
coverage_0x54a16165(0x0dd9b0d694fd9efb567c175ee2efc0d5199eb2a85aab2e9a43ced9f7cb8fce68); /* line */ 
        coverage_0x54a16165(0x251caf91ddd7d1b92c242c8fd020f272f1c9f709c271454f8ba880b413ec4243); /* statement */ 
(y3, db) = jSub(
            y3,
            db,
            y1,
            z1
        );

coverage_0x54a16165(0x34f3a189d09c2856c971758b4d6f7b1945888cebf12204aa8f5be087705c669d); /* line */ 
        coverage_0x54a16165(0x254f1ff1c9ca23da753033b68d4d215697d6fed8a1c7a00709834de5339c9e81); /* statement */ 
if (da != db) {coverage_0x54a16165(0xe46500075b525075373167c46225a0ba6c17112d96ed663d1e1c3b168032c54d); /* branch */ 

coverage_0x54a16165(0x9bf01b55e4b9fbd5943f26a39afe3249ac019d501731b0f28fd72ec7a1ba0341); /* line */ 
            coverage_0x54a16165(0x278434ce69aad28646860f6ff1d7e1c704a6ddb5ba48ffcc9064cd53d6c6a497); /* statement */ 
x3 = mulmod(x3, db, N);
coverage_0x54a16165(0x7b51a78f760e35909e012f938eb277554e02a5e0852776ccf1fa7d156d4c8103); /* line */ 
            coverage_0x54a16165(0x18a678bec36201823cc1dab0d2f2d2436541ce1732b56796032ab8f3ab7c84eb); /* statement */ 
y3 = mulmod(y3, da, N);
coverage_0x54a16165(0x81505165f927469c5eca8993db838110d1c09c1cee3f523e7e9f913feabd1ace); /* line */ 
            coverage_0x54a16165(0xceac914aa62050474366529df722ba24284527f72c5e29623ca548381437dc13); /* statement */ 
z3 = mulmod(da, db, N);
        } else {coverage_0x54a16165(0x1d5331265b2ccd9a5178d9c280b9c4372c91124fa2045c5645da6e7910261631); /* branch */ 

coverage_0x54a16165(0x4af26b212c7115611e97e0cc8c3e68aa4158ef6c8011f5a980bba05d2c22cfdf); /* line */ 
            coverage_0x54a16165(0x6fb13cd724d20301b095f71f67553b3769cbc97bb797ee416b88a656422b27d9); /* statement */ 
z3 = da;
        }
    }

    function ecDouble(
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        public
        pure
        returns (uint256 x3, uint256 y3, uint256 z3)
    {coverage_0x54a16165(0xe2d835e7e94d17aff8cc8bc1f46392cdf401814ec8d63d50acd0c44c08b5d2a7); /* function */ 

coverage_0x54a16165(0xdde97ef2988ba5a8eb3936205ea7b49e16f4f1610a0273d5009805a0d572fdeb); /* line */ 
        coverage_0x54a16165(0x8f157d0811bafe8ecebe571340ca211bd852a47eb6f79d83f3069c9bf9b57ad5); /* statement */ 
(x3, y3, z3) = ecAdd(
            x1,
            y1,
            z1,
            x1,
            y1,
            z1
        );
    }

    function ecMul(
        uint256 d,
        uint256 x1,
        uint256 y1,
        uint256 z1
    )
        public
        pure
        returns (uint256 x3, uint256 y3, uint256 z3)
    {coverage_0x54a16165(0x50967edd9a02be0d4f75ed920e65912db47cbe40e951753abf4ae0b8a36933ab); /* function */ 

coverage_0x54a16165(0xd7693f6aacf4508fa6b93869fc2ede0a13dd4035eb6d32d86e512c61d776f79b); /* line */ 
        coverage_0x54a16165(0xd6cc227d985eb6117125bf022cf1d817a66f3e62a5ac41244c11a56fd056cb30); /* statement */ 
uint256 remaining = d;
coverage_0x54a16165(0xa8d899379d9b5817e292ef0f06f531ea168797fee234985f669465619681b9c0); /* line */ 
        coverage_0x54a16165(0x93dc6ab9008796865b9e6e1761764d66c2ed0d856d7db1d5e3b08d13af6ea369); /* statement */ 
uint256 px = x1;
coverage_0x54a16165(0xecbbb1459b460feb34054d69bb939b047e27af2390b1018022f2d5376c6916ae); /* line */ 
        coverage_0x54a16165(0x90938b51b8d937527f72f150eb0cc6fcb82c8904c04d4846b0b313a37d0efae4); /* statement */ 
uint256 py = y1;
coverage_0x54a16165(0x9d4ef3e5803c183e45a68b29c952546327926f1e37b7e8ac75e786275911d7ac); /* line */ 
        coverage_0x54a16165(0x179add24ac43ea4db03dcf1a12caed9941aff9ef33741edfd8505692add9ede6); /* statement */ 
uint256 pz = z1;
coverage_0x54a16165(0x22e6cce4395d0b4e945ac6b233f9cfdf734477f37975838b1531ff4f104495a6); /* line */ 
        coverage_0x54a16165(0xf4a6cfdfa58158058baa41f0bf192c11144bf2f3db3a1aa086745b116258ff4c); /* statement */ 
uint256 acx = 0;
coverage_0x54a16165(0xa3bc84fad6f3c9bee75439313c83df0d8d0d35c660c0de94acd7b98ff83676c9); /* line */ 
        coverage_0x54a16165(0x1b75659761f3adf7d614fcb77cb2fbb5b01951ffdf60c8f7849231fa07b31102); /* statement */ 
uint256 acy = 0;
coverage_0x54a16165(0x6a4f430416bbbc25d365f01be9c5288483777ec5ef119860fbd3215369af42bb); /* line */ 
        coverage_0x54a16165(0xcc06cb509c1e52b3e9cdc1d30ed4472154e5328c4fb28cb07c58311f5b4cf778); /* statement */ 
uint256 acz = 1;

coverage_0x54a16165(0x0158c00377dc7ff5eda80cfcd28514365e592b45f0ca7c6ddfc5efce0198a1f8); /* line */ 
        coverage_0x54a16165(0x9c061a158089509e2df41a8adff2fef9459b480d53c61109224a409d5e7cd32a); /* statement */ 
if (d == 0) {coverage_0x54a16165(0x905c30f430bc8b57cdf1544d86120a4b980b58fc34a0bd30dc8a2f5688e484f8); /* branch */ 

coverage_0x54a16165(0x1c4c0a848973f5a21d476383882903e1e440e226fbdec4644093750fad640fed); /* line */ 
            coverage_0x54a16165(0x4cd7aa19d347674df7e488fb8bb513fa3ddeca0ef9d0a04b67688859b062f951); /* statement */ 
return (0, 0, 1);
        }else { coverage_0x54a16165(0xf5e888e5c39635a344e97784c6be44bd7af91a748eed2a1532e557b434917af5); /* branch */ 
}

coverage_0x54a16165(0xd6046bdbf09517c1d26a77e7eff0069634ba28c424ca994895b038905a86356e); /* line */ 
        coverage_0x54a16165(0x5060cacef5c93ca691056a7f4a80c7bd4cf289368210c44ea89488ee5ca89d0d); /* statement */ 
while (remaining != 0) {
coverage_0x54a16165(0x850134d67c5f8187e9ef2e8a6edf8f82b88e0de0ee6a1d17b6055ccd9fac1b01); /* line */ 
            coverage_0x54a16165(0xbd6b0d64c19d054628336baaf9e1a40fdac6a44b1ace5c0e84da84ab3a129e8d); /* statement */ 
if ((remaining & 1) != 0) {coverage_0x54a16165(0x073ecea86d045fb9ab51fe60d82715058953a45eedf2f4bd487e5cbfc70710aa); /* branch */ 

coverage_0x54a16165(0x559e4e909a027e2cca675f6cc69944c94e9176af39388b38e15ab3e2eeaccc19); /* line */ 
                coverage_0x54a16165(0xc72e1440ae685995da23dc8add805189bcd5850656620ae68e1771006bd5ddeb); /* statement */ 
(acx, acy, acz) = ecAdd(
                    acx,
                    acy,
                    acz,
                    px,
                    py,
                    pz
                );
            }else { coverage_0x54a16165(0x4450b0c784ffd877694fce9dc8eb57f60331a2578e528d3cec3af0ec67a9e346); /* branch */ 
}
coverage_0x54a16165(0xd2b2c61f6e02a7f9a5af80ff8cace7a5f2d62981942491074977f31b02ca95f5); /* line */ 
            coverage_0x54a16165(0x23c864c0114703a52a5c3c6bff1425e7d9a9f9dd7ae86ed06facb99271520537); /* statement */ 
remaining = remaining / 2;
coverage_0x54a16165(0x3709624d47972479890fcfd59da6d63ff59c31e15bdb44f41a7e58d98f03e12d); /* line */ 
            coverage_0x54a16165(0x6cac487bd9fce22e67e3d27d741790531b51ed0505b31e6430936be20da420e5); /* statement */ 
(px, py, pz) = ecDouble(px, py, pz);
        }

coverage_0x54a16165(0x29457faf9dc5941d497314b46c09ec1832c99b53ef765e9f709c63e5f86e19f5); /* line */ 
        coverage_0x54a16165(0x7a23e652466527186ed53904950fa12bd317e866e069c6e51474009191c9e7fd); /* statement */ 
(x3, y3, z3) = (acx, acy, acz);
    }
}
